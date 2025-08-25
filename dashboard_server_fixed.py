from fastapi import FastAPI, HTTPException, Query, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Dict, Any, Union, Annotated
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import uvicorn
from pydantic import BaseModel, EmailStr, Field
import json
from scipy import stats
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from dotenv import load_dotenv
import os
import warnings
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

# Import ML predictions module
from ml_predictions import predict_health_outcomes, calculate_population_risk_scores, health_predictor

# =============================================================================
# DATABASE SETUP AND MODELS
# =============================================================================

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./digital_twin.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class AdultRecord(Base):
    __tablename__ = "adults"
    
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(String, index=True)
    household_id = Column(String, ForeignKey("households.household_id"))
    date = Column(DateTime)
    month = Column(Integer)
    age = Column(Integer)
    sistol = Column(Float)
    diastol = Column(Float)
    on_treatment = Column(Boolean, default=False)
    diabetes_koin = Column(Boolean, default=False)
    perokok = Column(Boolean, default=False)
    adherence_current = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    household = relationship("HouseholdRecord", back_populates="adults")

class ChildRecord(Base):
    __tablename__ = "children"
    
    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(String, index=True)
    household_id = Column(String, ForeignKey("households.household_id"))
    date = Column(DateTime)
    month = Column(Integer)
    usia_bulan = Column(Integer)
    HAZ = Column(Float)
    on_program = Column(Boolean, default=False)
    anemia_hb_gdl = Column(Float)
    air_bersih = Column(Boolean, default=True)
    jamban_sehat = Column(Boolean, default=True)
    haz_change_this_month = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    household = relationship("HouseholdRecord", back_populates="children")

class HouseholdRecord(Base):
    __tablename__ = "households"
    
    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(String, unique=True, index=True)
    pendapatan_rt = Column(Float)
    kepemilikan_rumah = Column(Boolean, default=True)
    akses_listrik = Column(Boolean, default=True)
    akses_internet = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    adults = relationship("AdultRecord", back_populates="household")
    children = relationship("ChildRecord", back_populates="household")
    programs = relationship("ProgramRecord", back_populates="household")

class ProgramRecord(Base):
    __tablename__ = "programs"
    
    id = Column(Integer, primary_key=True, index=True)
    program = Column(String)
    target_id = Column(String)
    household_id = Column(String, ForeignKey("households.household_id"))
    tanggal = Column(DateTime)
    biaya_riil = Column(Float)
    status = Column(String, default="active")
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    household = relationship("HouseholdRecord", back_populates="programs")

# Create tables
Base.metadata.create_all(bind=engine)

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def safe_float(value, default=0.0):
    """Safely convert a value to float, replacing NaN/inf with default"""
    if pd.isna(value) or value == float('inf') or value == float('-inf'):
        return default
    return float(value)

def safe_float_list(values, default=0.0):
    """Safely convert a list of values to floats, replacing NaN/inf with default"""
    return [safe_float(v, default) for v in values]

# =============================================================================
# AUTHENTICATION SETUP
# =============================================================================

# API Key Authentication
API_KEY = os.getenv("API_KEY")
security = HTTPBearer()

async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key from Authorization header"""
    if credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =============================================================================
# PYDANTIC MODELS FOR API
# =============================================================================

# Request/Response Models
class AdultCreate(BaseModel):
    person_id: str
    household_id: str
    date: datetime
    month: int
    age: int
    sistol: float
    diastol: float
    on_treatment: bool = False
    diabetes_koin: bool = False
    perokok: bool = False
    adherence_current: float = 1.0

class AdultUpdate(BaseModel):
    sistol: Optional[float] = None
    diastol: Optional[float] = None
    on_treatment: Optional[bool] = None
    diabetes_koin: Optional[bool] = None
    perokok: Optional[bool] = None
    adherence_current: Optional[float] = None

class AdultResponse(BaseModel):
    id: int
    person_id: str
    household_id: str
    date: datetime
    month: int
    age: int
    sistol: float
    diastol: float
    on_treatment: bool
    diabetes_koin: bool
    perokok: bool
    adherence_current: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ChildCreate(BaseModel):
    child_id: str
    household_id: str
    date: datetime
    month: int
    usia_bulan: int
    HAZ: float
    on_program: bool = False
    anemia_hb_gdl: Optional[float] = None
    air_bersih: bool = True
    jamban_sehat: bool = True
    haz_change_this_month: float = 0.0

class ChildUpdate(BaseModel):
    usia_bulan: Optional[int] = None
    HAZ: Optional[float] = None
    on_program: Optional[bool] = None
    anemia_hb_gdl: Optional[float] = None
    air_bersih: Optional[bool] = None
    jamban_sehat: Optional[bool] = None
    haz_change_this_month: Optional[float] = None

class ChildResponse(BaseModel):
    id: int
    child_id: str
    household_id: str
    date: datetime
    month: int
    usia_bulan: int
    HAZ: float
    on_program: bool
    anemia_hb_gdl: Optional[float]
    air_bersih: bool
    jamban_sehat: bool
    haz_change_this_month: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class HouseholdCreate(BaseModel):
    household_id: str
    pendapatan_rt: float
    kepemilikan_rumah: bool = True
    akses_listrik: bool = True
    akses_internet: bool = False

class HouseholdUpdate(BaseModel):
    pendapatan_rt: Optional[float] = None
    kepemilikan_rumah: Optional[bool] = None
    akses_listrik: Optional[bool] = None
    akses_internet: Optional[bool] = None

class HouseholdResponse(BaseModel):
    id: int
    household_id: str
    pendapatan_rt: float
    kepemilikan_rumah: bool
    akses_listrik: bool
    akses_internet: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProgramCreate(BaseModel):
    program: str
    target_id: str
    household_id: str
    tanggal: datetime
    biaya_riil: float
    status: str = "active"
    description: Optional[str] = None

class ProgramUpdate(BaseModel):
    program: Optional[str] = None
    biaya_riil: Optional[float] = None
    status: Optional[str] = None
    description: Optional[str] = None

class ProgramResponse(BaseModel):
    id: int
    program: str
    target_id: str
    household_id: str
    tanggal: datetime
    biaya_riil: float
    status: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Initialize FastAPI app
app = FastAPI(
    title="API Dasbor Kesehatan Digital Twin dengan Operasi CRUD",
    description="API untuk pemantauan program kesehatan dengan fungsionalitas CRUD lengkap dan autentikasi aman",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware for frontend integration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# CRUD OPERATIONS - ADULTS
# =============================================================================

@app.post("/adults/", response_model=AdultResponse, tags=["Adults CRUD"])
async def create_adult(
    adult: AdultCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Create a new adult record"""
    db_adult = AdultRecord(**adult.dict())
    db.add(db_adult)
    db.commit()
    db.refresh(db_adult)
    return db_adult

@app.get("/adults/", response_model=List[AdultResponse], tags=["Adults CRUD"])
async def read_adults(
    skip: int = 0,
    limit: int = 100,
    household_id: Optional[str] = None,
    person_id: Optional[str] = None,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Get all adult records with optional filtering"""
    query = db.query(AdultRecord)
    
    if household_id:
        query = query.filter(AdultRecord.household_id == household_id)
    if person_id:
        query = query.filter(AdultRecord.person_id == person_id)
    
    adults = query.offset(skip).limit(limit).all()
    return adults

@app.get("/adults/{adult_id}", response_model=AdultResponse, tags=["Adults CRUD"])
async def read_adult(
    adult_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Get a specific adult record by ID"""
    adult = db.query(AdultRecord).filter(AdultRecord.id == adult_id).first()
    if adult is None:
        raise HTTPException(status_code=404, detail="Adult record not found")
    return adult

@app.put("/adults/{adult_id}", response_model=AdultResponse, tags=["Adults CRUD"])
async def update_adult(
    adult_id: int,
    adult_update: AdultUpdate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Update an existing adult record"""
    adult = db.query(AdultRecord).filter(AdultRecord.id == adult_id).first()
    if adult is None:
        raise HTTPException(status_code=404, detail="Adult record not found")
    
    update_data = adult_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(adult, field, value)
    
    adult.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(adult)
    return adult

@app.delete("/adults/{adult_id}", tags=["Adults CRUD"])
async def delete_adult(
    adult_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Delete an adult record"""
    adult = db.query(AdultRecord).filter(AdultRecord.id == adult_id).first()
    if adult is None:
        raise HTTPException(status_code=404, detail="Adult record not found")
    
    db.delete(adult)
    db.commit()
    return {"message": "Adult record deleted successfully"}

# =============================================================================
# CRUD OPERATIONS - CHILDREN
# =============================================================================

@app.post("/children/", response_model=ChildResponse, tags=["Children CRUD"])
async def create_child(
    child: ChildCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Create a new child record"""
    db_child = ChildRecord(**child.dict())
    db.add(db_child)
    db.commit()
    db.refresh(db_child)
    return db_child

@app.get("/children/", response_model=List[ChildResponse], tags=["Children CRUD"])
async def read_children(
    skip: int = 0,
    limit: int = 100,
    household_id: Optional[str] = None,
    child_id: Optional[str] = None,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Get all child records with optional filtering"""
    query = db.query(ChildRecord)
    
    if household_id:
        query = query.filter(ChildRecord.household_id == household_id)
    if child_id:
        query = query.filter(ChildRecord.child_id == child_id)
    
    children = query.offset(skip).limit(limit).all()
    return children

@app.get("/children/{record_id}", response_model=ChildResponse, tags=["Children CRUD"])
async def read_child(
    record_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Get a specific child record by ID"""
    child = db.query(ChildRecord).filter(ChildRecord.id == record_id).first()
    if child is None:
        raise HTTPException(status_code=404, detail="Child record not found")
    return child

@app.put("/children/{record_id}", response_model=ChildResponse, tags=["Children CRUD"])
async def update_child(
    record_id: int,
    child_update: ChildUpdate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Update an existing child record"""
    child = db.query(ChildRecord).filter(ChildRecord.id == record_id).first()
    if child is None:
        raise HTTPException(status_code=404, detail="Child record not found")
    
    update_data = child_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(child, field, value)
    
    child.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(child)
    return child

@app.delete("/children/{record_id}", tags=["Children CRUD"])
async def delete_child(
    record_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Delete a child record"""
    child = db.query(ChildRecord).filter(ChildRecord.id == record_id).first()
    if child is None:
        raise HTTPException(status_code=404, detail="Child record not found")
    
    db.delete(child)
    db.commit()
    return {"message": "Child record deleted successfully"}

# =============================================================================
# CRUD OPERATIONS - HOUSEHOLDS
# =============================================================================

@app.post("/households/", response_model=HouseholdResponse, tags=["Households CRUD"])
async def create_household(
    household: HouseholdCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Create a new household record"""
    # Check if household_id already exists
    existing = db.query(HouseholdRecord).filter(HouseholdRecord.household_id == household.household_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Household ID already exists")
    
    db_household = HouseholdRecord(**household.dict())
    db.add(db_household)
    db.commit()
    db.refresh(db_household)
    return db_household

@app.get("/households/", response_model=List[HouseholdResponse], tags=["Households CRUD"])
async def read_households(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Get all household records"""
    households = db.query(HouseholdRecord).offset(skip).limit(limit).all()
    return households

@app.get("/households/{household_id}", response_model=HouseholdResponse, tags=["Households CRUD"])
async def read_household(
    household_id: str,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Get a specific household record by household_id"""
    household = db.query(HouseholdRecord).filter(HouseholdRecord.household_id == household_id).first()
    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")
    return household

@app.put("/households/{household_id}", response_model=HouseholdResponse, tags=["Households CRUD"])
async def update_household(
    household_id: str,
    household_update: HouseholdUpdate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Update an existing household record"""
    household = db.query(HouseholdRecord).filter(HouseholdRecord.household_id == household_id).first()
    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")
    
    update_data = household_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(household, field, value)
    
    household.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(household)
    return household

@app.delete("/households/{household_id}", tags=["Households CRUD"])
async def delete_household(
    household_id: str,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Delete a household record and all related data"""
    household = db.query(HouseholdRecord).filter(HouseholdRecord.household_id == household_id).first()
    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")
    
    # Delete related records first
    db.query(AdultRecord).filter(AdultRecord.household_id == household_id).delete()
    db.query(ChildRecord).filter(ChildRecord.household_id == household_id).delete()
    db.query(ProgramRecord).filter(ProgramRecord.household_id == household_id).delete()
    
    # Delete household
    db.delete(household)
    db.commit()
    return {"message": "Household and all related data deleted successfully"}

# =============================================================================
# CRUD OPERATIONS - PROGRAMS
# =============================================================================

@app.post("/programs/", response_model=ProgramResponse, tags=["Programs CRUD"])
async def create_program(
    program: ProgramCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Create a new program record"""
    db_program = ProgramRecord(**program.dict())
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return db_program

@app.get("/programs/", response_model=List[ProgramResponse], tags=["Programs CRUD"])
async def read_programs(
    skip: int = 0,
    limit: int = 100,
    household_id: Optional[str] = None,
    program_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Get all program records with optional filtering"""
    query = db.query(ProgramRecord)
    
    if household_id:
        query = query.filter(ProgramRecord.household_id == household_id)
    if program_type:
        query = query.filter(ProgramRecord.program.ilike(f"%{program_type}%"))
    if status:
        query = query.filter(ProgramRecord.status == status)
    
    programs = query.offset(skip).limit(limit).all()
    return programs

@app.get("/programs/{program_id}", response_model=ProgramResponse, tags=["Programs CRUD"])
async def read_program(
    program_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Get a specific program record by ID"""
    program = db.query(ProgramRecord).filter(ProgramRecord.id == program_id).first()
    if program is None:
        raise HTTPException(status_code=404, detail="Program record not found")
    return program

@app.put("/programs/{program_id}", response_model=ProgramResponse, tags=["Programs CRUD"])
async def update_program(
    program_id: int,
    program_update: ProgramUpdate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Update an existing program record"""
    program = db.query(ProgramRecord).filter(ProgramRecord.id == program_id).first()
    if program is None:
        raise HTTPException(status_code=404, detail="Program record not found")
    
    update_data = program_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(program, field, value)
    
    program.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(program)
    return program

@app.delete("/programs/{program_id}", tags=["Programs CRUD"])
async def delete_program(
    program_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Delete a program record"""
    program = db.query(ProgramRecord).filter(ProgramRecord.id == program_id).first()
    if program is None:
        raise HTTPException(status_code=404, detail="Program record not found")
    
    db.delete(program)
    db.commit()
    return {"message": "Program record deleted successfully"}

# =============================================================================
# BULK OPERATIONS
# =============================================================================

@app.post("/adults/bulk/", response_model=List[AdultResponse], tags=["Bulk Operations"])
async def create_adults_bulk(
    adults: List[AdultCreate],
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Create multiple adult records at once"""
    db_adults = [AdultRecord(**adult.dict()) for adult in adults]
    db.add_all(db_adults)
    db.commit()
    for adult in db_adults:
        db.refresh(adult)
    return db_adults

@app.post("/children/bulk/", response_model=List[ChildResponse], tags=["Bulk Operations"])
async def create_children_bulk(
    children: List[ChildCreate],
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Create multiple child records at once"""
    db_children = [ChildRecord(**child.dict()) for child in children]
    db.add_all(db_children)
    db.commit()
    for child in db_children:
        db.refresh(child)
    return db_children

@app.post("/households/bulk/", response_model=List[HouseholdResponse], tags=["Bulk Operations"])
async def create_households_bulk(
    households: List[HouseholdCreate],
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Create multiple household records at once"""
    # Check for duplicate household_ids
    household_ids = [h.household_id for h in households]
    existing = db.query(HouseholdRecord).filter(HouseholdRecord.household_id.in_(household_ids)).all()
    if existing:
        existing_ids = [h.household_id for h in existing]
        raise HTTPException(
            status_code=400, 
            detail=f"Household IDs already exist: {existing_ids}"
        )
    
    db_households = [HouseholdRecord(**household.dict()) for household in households]
    db.add_all(db_households)
    db.commit()
    for household in db_households:
        db.refresh(household)
    return db_households

@app.post("/programs/bulk/", response_model=List[ProgramResponse], tags=["Bulk Operations"])
async def create_programs_bulk(
    programs: List[ProgramCreate],
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Create multiple program records at once"""
    db_programs = [ProgramRecord(**program.dict()) for program in programs]
    db.add_all(db_programs)
    db.commit()
    for program in db_programs:
        db.refresh(program)
    return db_programs

# =============================================================================
# DATA MIGRATION AND SYNCHRONIZATION
# =============================================================================

@app.post("/data/migrate-csv/", tags=["Data Migration"])
async def migrate_csv_to_database(
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Migrate existing CSV data to database"""
    try:
        # Load existing CSV data
        if not data_cache:
            load_data()
        
        migration_summary = {
            "households": 0,
            "adults": 0,
            "children": 0,
            "programs": 0,
            "errors": []
        }
        
        # Migrate households first
        if 'households' in data_cache:
            households_df = data_cache['households']
            for _, row in households_df.iterrows():
                try:
                    existing = db.query(HouseholdRecord).filter(
                        HouseholdRecord.household_id == row['household_id']
                    ).first()
                    
                    if not existing:
                        household = HouseholdRecord(
                            household_id=row['household_id'],
                            pendapatan_rt=float(row.get('pendapatan_rt', 0)),
                            kepemilikan_rumah=bool(row.get('kepemilikan_rumah', True)),
                            akses_listrik=bool(row.get('akses_listrik', True)),
                            akses_internet=bool(row.get('akses_internet', False))
                        )
                        db.add(household)
                        migration_summary["households"] += 1
                except Exception as e:
                    migration_summary["errors"].append(f"Household {row.get('household_id', 'unknown')}: {str(e)}")
        
        # Migrate adults
        if 'adults' in data_cache:
            adults_df = data_cache['adults']
            for _, row in adults_df.iterrows():
                try:
                    existing = db.query(AdultRecord).filter(
                        AdultRecord.person_id == row['person_id'],
                        AdultRecord.date == row['date']
                    ).first()
                    
                    if not existing:
                        adult = AdultRecord(
                            person_id=row['person_id'],
                            household_id=row['household_id'],
                            date=row['date'],
                            month=int(row.get('month', 0)),
                            age=int(row.get('age', row.get('usia', 0))),
                            sistol=float(row.get('sistol', 0)),
                            diastol=float(row.get('diastol', 0)),
                            on_treatment=bool(row.get('on_treatment', False)),
                            diabetes_koin=bool(row.get('diabetes_koin', False)),
                            perokok=bool(row.get('perokok', False)),
                            adherence_current=float(row.get('adherence_current', 1.0))
                        )
                        db.add(adult)
                        migration_summary["adults"] += 1
                except Exception as e:
                    migration_summary["errors"].append(f"Adult {row.get('person_id', 'unknown')}: {str(e)}")
        
        # Migrate children
        if 'children' in data_cache:
            children_df = data_cache['children']
            for _, row in children_df.iterrows():
                try:
                    existing = db.query(ChildRecord).filter(
                        ChildRecord.child_id == row['child_id'],
                        ChildRecord.date == row['date']
                    ).first()
                    
                    if not existing:
                        child = ChildRecord(
                            child_id=row['child_id'],
                            household_id=row['household_id'],
                            date=row['date'],
                            month=int(row.get('month', 0)),
                            usia_bulan=int(row.get('usia_bulan', 0)),
                            HAZ=float(row.get('HAZ', 0)),
                            on_program=bool(row.get('on_program', False)),
                            anemia_hb_gdl=float(row.get('anemia_hb_gdl', 12)) if pd.notna(row.get('anemia_hb_gdl')) else None,
                            air_bersih=bool(row.get('air_bersih', True)),
                            jamban_sehat=bool(row.get('jamban_sehat', True)),
                            haz_change_this_month=float(row.get('haz_change_this_month', 0))
                        )
                        db.add(child)
                        migration_summary["children"] += 1
                except Exception as e:
                    migration_summary["errors"].append(f"Child {row.get('child_id', 'unknown')}: {str(e)}")
        
        # Migrate programs
        if 'program_log' in data_cache:
            programs_df = data_cache['program_log']
            for _, row in programs_df.iterrows():
                try:
                    program = ProgramRecord(
                        program=row['program'],
                        target_id=row['target_id'],
                        household_id=row.get('household_id', ''),
                        tanggal=row['tanggal'],
                        biaya_riil=float(row.get('biaya_riil', 0)),
                        status="active",
                        description=row.get('description', '')
                    )
                    db.add(program)
                    migration_summary["programs"] += 1
                except Exception as e:
                    migration_summary["errors"].append(f"Program {row.get('program', 'unknown')}: {str(e)}")
        
        db.commit()
        
        return {
            "message": "Data migration completed",
            "summary": migration_summary
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

# Global data storage
data_cache = {}

def safe_correlation(x, y):
    """Safely calculate correlation, returning 0.0 if NaN or insufficient data"""
    try:
        # Remove NaN values
        valid_data = pd.DataFrame({'x': x, 'y': y}).dropna()
        if len(valid_data) < 2:
            return 0.0
        
        correlation = np.corrcoef(valid_data['x'], valid_data['y'])[0, 1]
        return 0.0 if pd.isna(correlation) else float(correlation)
    except:
        return 0.0

def safe_float(value, default=0.0):
    """Safely convert value to float, handling NaN"""
    if pd.isna(value):
        return default
    try:
        return float(value)
    except:
        return default

def load_data():
    """Load all longitudinal datasets into memory"""
    global data_cache
    try:
        data_cache['adults'] = pd.read_csv('adults_htn_longitudinal.csv')
        data_cache['children'] = pd.read_csv('children_stunting_longitudinal.csv')
        data_cache['program_log'] = pd.read_csv('program_log_longitudinal_corrected.csv')
        data_cache['households'] = pd.read_csv('households_expanded.csv')
        data_cache['costs_catalog'] = pd.read_csv('COSTS_CATALOG.csv')
        
        # Convert date columns
        data_cache['adults']['date'] = pd.to_datetime(data_cache['adults']['date'])
        data_cache['children']['date'] = pd.to_datetime(data_cache['children']['date'])
        data_cache['program_log']['tanggal'] = pd.to_datetime(data_cache['program_log']['tanggal'])
        
        print("✅ Semua dataset berhasil dimuat")
        return True
    except Exception as e:
        print(f"❌ Kesalahan memuat data: {e}")
        return False

# =============================================================================
# RISK FACTOR ANALYSIS FUNCTIONS
# =============================================================================

def analyze_hypertension_risk_factors(adults_df, households_df):
    """Comprehensive analysis of risk factors affecting hypertension (BP)"""
    
    try:
        # Merge adults with household data for comprehensive analysis
        merged_df = adults_df.merge(households_df, on='household_id', how='left')
        
        # Define hypertension (systolic ≥140 OR diastolic ≥90) - handle missing values
        systolic_high = merged_df['sistol'].fillna(0) >= 140
        diastolic_high = merged_df['diastol'].fillna(0) >= 90
        merged_df['hypertensive'] = (systolic_high | diastolic_high).astype(int)
        
        risk_factors = []
        
        # 1. AGE FACTOR ANALYSIS
        merged_df['age'] = merged_df['age'].fillna(merged_df['age'].median())
        # Create simple age groups to avoid potential issues with pd.cut
        age_conditions = [
            (merged_df['age'] < 30, '<30'),
            ((merged_df['age'] >= 30) & (merged_df['age'] < 40), '30-39'),
            ((merged_df['age'] >= 40) & (merged_df['age'] < 50), '40-49'),
            ((merged_df['age'] >= 50) & (merged_df['age'] < 60), '50-59'),
            (merged_df['age'] >= 60, '60+')
        ]
        
        merged_df['age_group'] = 'Unknown'
        for condition, label in age_conditions:
            merged_df.loc[condition, 'age_group'] = label
        
        age_prevalence = merged_df.groupby('age_group')['hypertensive'].agg(['mean', 'count']).reset_index()
        age_correlation = safe_correlation(merged_df['age'], merged_df['hypertensive'])
        
        risk_factors.append({
            'factor': 'Usia',
            'correlation': round(age_correlation, 3),
            'impact_description': f'Korelasi positif kuat - prevalensi meningkat {round(abs(age_correlation)*100, 1)}% per unit usia',
            'prevalence_data': age_prevalence.to_dict('records'),
            'total_affected': int((merged_df['hypertensive'] == 1).sum()),
            'risk_level': 'high' if abs(age_correlation) > 0.6 else 'moderate' if abs(age_correlation) > 0.3 else 'low',
            'chart_type': 'bar',
            'x_axis': 'age_group',
            'y_axis': 'prevalence_rate'
        })
        
        # 2. SOCIOECONOMIC STATUS ANALYSIS - Simplified
        if 'pendapatan_rt' in merged_df.columns:
            try:
                # Use simple percentile-based groups instead of pd.qcut
                income_median = merged_df['pendapatan_rt'].median()
                merged_df['income_group'] = 'Unknown'
                merged_df.loc[merged_df['pendapatan_rt'] < income_median, 'income_group'] = 'Low Income'
                merged_df.loc[merged_df['pendapatan_rt'] >= income_median, 'income_group'] = 'High Income'
                
                income_prevalence = merged_df.groupby('income_group')['hypertensive'].agg(['mean', 'count']).reset_index()
                income_correlation = safe_correlation(merged_df['pendapatan_rt'], merged_df['hypertensive'])
                
                risk_factors.append({
                    'factor': 'Penghasilan',
                    'correlation': round(income_correlation, 3),
                    'impact_description': f'Income shows {round(abs(income_correlation)*100, 1)}% correlation with hypertension',
                    'prevalence_data': income_prevalence.to_dict('records'),
                    'total_affected': int((merged_df['hypertensive'] == 1).sum()),
                    'risk_level': 'high' if abs(income_correlation) > 0.4 else 'moderate' if abs(income_correlation) > 0.2 else 'low',
                    'chart_type': 'bar',
                    'x_axis': 'income_group',
                    'y_axis': 'prevalence_rate'
                })
            except Exception as e:
                print(f"Error in socioeconomic analysis: {e}")
        
        # 3. TREATMENT ADHERENCE FACTOR
        if 'on_treatment' in merged_df.columns:
            try:
                treatment_analysis = merged_df.groupby('on_treatment').agg({
                    'sistol': 'mean',
                    'diastol': 'mean',
                    'hypertensive': 'mean'
                }).reset_index()
                
                treated_group = merged_df[merged_df['on_treatment'] == 1]['sistol']
                untreated_group = merged_df[merged_df['on_treatment'] == 0]['sistol']
                
                treatment_effect = 0.0
                if len(treated_group) > 0 and len(untreated_group) > 0:
                    treated_mean = safe_float(treated_group.mean())
                    untreated_mean = safe_float(untreated_group.mean())
                    treatment_effect = treated_mean - untreated_mean
                
                risk_factors.append({
                    'factor': 'Kepatuhan Pengobatan',
                    'correlation': round(treatment_effect / 20, 3),
                    'impact_description': f'Treatment reduces systolic BP by {abs(treatment_effect):.1f} mmHg on average',
                    'prevalence_data': treatment_analysis.to_dict('records'),
                    'total_affected': int((merged_df['on_treatment'] == 1).sum()),
                    'risk_level': 'high' if abs(treatment_effect) > 15 else 'moderate' if abs(treatment_effect) > 5 else 'low',
                    'chart_type': 'scatter',
                    'x_axis': 'treatment_status',
                    'y_axis': 'avg_bp'
                })
            except Exception as e:
                print(f"Error in treatment analysis: {e}")
        
        # 4. INFRASTRUCTURE FACTORS - Simplified
        infrastructure_factors = ['kepemilikan_rumah', 'akses_listrik', 'akses_internet']
        factor_names = {
            'kepemilikan_rumah': 'Kepemilikan Rumah',
            'akses_listrik': 'Akses Listrik', 
            'akses_internet': 'Akses Internet'
        }
        
        for factor in infrastructure_factors:
            if factor in merged_df.columns:
                try:
                    factor_analysis = merged_df.groupby(factor)['hypertensive'].agg(['mean', 'count']).reset_index()
                    factor_correlation = safe_correlation(merged_df[factor], merged_df['hypertensive'])
                    
                    risk_factors.append({
                        'factor': factor_names.get(factor, factor),
                        'correlation': round(factor_correlation, 3),
                        'impact_description': f'{factor_names.get(factor, factor)} shows {round(abs(factor_correlation)*100, 1)}% correlation with hypertension',
                        'prevalence_data': factor_analysis.to_dict('records'),
                        'total_affected': int((merged_df['hypertensive'] == 1).sum()),
                        'risk_level': 'high' if abs(factor_correlation) > 0.3 else 'moderate' if abs(factor_correlation) > 0.15 else 'low',
                        'chart_type': 'bar',
                        'x_axis': factor,
                        'y_axis': 'prevalence_rate'
                    })
                except Exception as e:
                    print(f"Error in {factor} analysis: {e}")
        
        return risk_factors
        
    except Exception as e:
        print(f"Error in hypertension risk analysis: {e}")
        import traceback
        traceback.print_exc()
        return []
    
    # 2. SOCIOECONOMIC STATUS ANALYSIS
    # Create income quintiles and analyze relationship
    if 'pendapatan_rt' in merged_df.columns:
        try:
            merged_df['income_quintile'] = pd.qcut(merged_df['pendapatan_rt'], 
                                                  q=5, 
                                                  labels=['Q1(Lowest)', 'Q2', 'Q3', 'Q4', 'Q5(Highest)'],
                                                  duplicates='drop')
            
            income_prevalence = merged_df.groupby('income_quintile')['hypertensive'].agg(['mean', 'count']).reset_index()
            
            # Calculate income correlation using safe function
            income_correlation = safe_correlation(merged_df['pendapatan_rt'], merged_df['hypertensive'])
            
            risk_factors.append({
                'factor': 'Socioeconomic Status (Income)',
                'correlation': round(income_correlation, 3),
                'impact_description': f'Lower income associated with {round(abs(income_correlation)*100, 1)}% higher hypertension risk',
                'prevalence_data': income_prevalence.to_dict('records'),
                'total_affected': int((merged_df['hypertensive'] == 1).sum()),
                'risk_level': 'high' if abs(income_correlation) > 0.4 else 'moderate' if abs(income_correlation) > 0.2 else 'low',
                'chart_type': 'bar',
                'x_axis': 'income_quintile',
                'y_axis': 'prevalence_rate'
            })
        except:
            pass
    
    # 3. TREATMENT ADHERENCE FACTOR
    # Analyze relationship between treatment and BP control
    if 'on_treatment' in merged_df.columns:
        treatment_analysis = merged_df.groupby('on_treatment').agg({
            'sistol': 'mean',
            'diastol': 'mean',
            'hypertensive': 'mean'
        }).reset_index()
        
        # Calculate treatment effect with safe handling
        treated_group = merged_df[merged_df['on_treatment'] == 1]['sistol']
        untreated_group = merged_df[merged_df['on_treatment'] == 0]['sistol']
        
        treatment_effect = 0.0
        if len(treated_group) > 0 and len(untreated_group) > 0:
            treated_mean = safe_float(treated_group.mean())
            untreated_mean = safe_float(untreated_group.mean())
            treatment_effect = treated_mean - untreated_mean
        
        risk_factors.append({
            'factor': 'Treatment Adherence',
            'correlation': round(treatment_effect / 20, 3),  # Normalize to correlation scale
            'impact_description': f'Treatment reduces systolic BP by {abs(treatment_effect):.1f} mmHg on average',
            'prevalence_data': treatment_analysis.to_dict('records'),
            'total_affected': int(merged_df[merged_df['on_treatment'] == 1].shape[0]),
            'risk_level': 'high' if abs(treatment_effect) > 15 else 'moderate' if abs(treatment_effect) > 5 else 'low',
            'chart_type': 'scatter',
            'x_axis': 'treatment_status',
            'y_axis': 'avg_bp'
        })
    
        # 4. GEOGRAPHIC/HOUSEHOLD FACTORS
        # Analyze household infrastructure impact
        infrastructure_factors = ['kepemilikan_rumah', 'akses_listrik', 'akses_internet']
        for factor in infrastructure_factors:
            if factor in merged_df.columns:
                factor_analysis = merged_df.groupby(factor)['hypertensive'].agg(['mean', 'count']).reset_index()
                
                # Calculate correlation with safe handling
                factor_correlation = safe_correlation(merged_df[factor], merged_df['hypertensive'])
                
                factor_names = {
                    'kepemilikan_rumah': 'Kepemilikan Rumah',
                    'akses_listrik': 'Akses Listrik', 
                    'akses_internet': 'Akses Internet'
                }
                
                risk_factors.append({
                'factor': factor_names.get(factor, factor),
                'correlation': round(factor_correlation, 3),
                'impact_description': f'{factor_names.get(factor, factor)} menunjukkan korelasi {round(abs(factor_correlation)*100, 1)}% dengan hipertensi',
                'prevalence_data': factor_analysis.to_dict('records'),
                'total_affected': int((merged_df['hypertensive'] == 1).sum()),
                'risk_level': 'high' if abs(factor_correlation) > 0.3 else 'moderate' if abs(factor_correlation) > 0.15 else 'low',
                'chart_type': 'bar',
                'x_axis': factor,
                'y_axis': 'prevalence_rate'
            })
    
    # 5. LIFESTYLE/BEHAVIORAL FACTORS (Simulated)
    # Since lifestyle data might not be available, create realistic simulations based on epidemiological data
    
    # Smoking simulation (known strong risk factor)
    np.random.seed(42)  # For reproducible results
    smoking_prob = 0.3  # 30% smoking rate
    merged_df['smoking_status'] = np.random.binomial(1, smoking_prob, len(merged_df))
    
    # Smoking increases hypertension risk by ~40%
    smoking_effect = merged_df.groupby('smoking_status')['hypertensive'].mean()
    
    # Calculate smoking correlation with safe handling
    smoking_correlation = safe_correlation(merged_df['smoking_status'], merged_df['hypertensive'])
    
    # Handle case where smoking_effect might have missing values
    smoking_effect_diff = 0.0
    if len(smoking_effect) >= 2:
        smoking_effect_diff = safe_float(smoking_effect.iloc[1]) - safe_float(smoking_effect.iloc[0])
    
    risk_factors.append({
        'factor': 'Status Merokok (Simulasi)',
        'correlation': round(smoking_correlation, 3),
        'impact_description': f'Merokok meningkatkan risiko hipertensi sebesar {round(abs(smoking_effect_diff)*100, 1)} persen poin',
        'prevalence_data': [
            {'smoking_status': 'Tidak Merokok', 'mean': safe_float(smoking_effect.iloc[0]) if len(smoking_effect) > 0 else 0.0, 'count': int((merged_df['smoking_status'] == 0).sum())},
            {'smoking_status': 'Merokok', 'mean': safe_float(smoking_effect.iloc[1]) if len(smoking_effect) > 1 else 0.0, 'count': int((merged_df['smoking_status'] == 1).sum())}
        ],
        'total_affected': int((merged_df['hypertensive'] == 1).sum()),
        'risk_level': 'high',
        'chart_type': 'bar',
        'x_axis': 'smoking_status',
        'y_axis': 'prevalence_rate'
    })
    
    return risk_factors

def analyze_stunting_risk_factors(children_df, households_df):
    """Comprehensive analysis of risk factors affecting child stunting (HAZ)"""
    
    # Merge children with household data
    merged_df = children_df.merge(households_df, on='household_id', how='left')
    
    # Define stunting (HAZ < -2)
    merged_df['stunted'] = (merged_df['HAZ'] < -2).astype(int)
    
    risk_factors = []
    
    # 1. CRITICAL AGE PERIODS ANALYSIS
    # 0-24 months is most critical for stunting
    merged_df['age_group'] = pd.cut(merged_df['usia_bulan'], 
                                   bins=[0, 6, 12, 24, 36, 60], 
                                   labels=['0-6m', '6-12m', '12-24m', '24-36m', '36-60m'])
    
    age_prevalence = merged_df.groupby('age_group')['stunted'].agg(['mean', 'count']).reset_index()
    age_correlation = safe_correlation(merged_df['usia_bulan'], merged_df['stunted'])
    
    risk_factors.append({
        'factor': 'Periode Usia Kritis',
        'correlation': round(age_correlation, 3),
        'impact_description': f'Bulan-bulan awal menunjukkan {round(abs(age_correlation)*100, 1)}% kerentanan lebih tinggi terhadap stunting',
        'prevalence_data': age_prevalence.to_dict('records'),
        'total_affected': int((merged_df['stunted'] == 1).sum()),
        'risk_level': 'high' if abs(age_correlation) > 0.3 else 'moderate' if abs(age_correlation) > 0.15 else 'low',
        'chart_type': 'line',
        'x_axis': 'age_group',
        'y_axis': 'stunting_prevalence'
    })
    
    # 2. HOUSEHOLD ECONOMIC STATUS
    if 'pendapatan_rt' in merged_df.columns:
        try:
            merged_df['income_quintile'] = pd.qcut(merged_df['pendapatan_rt'], 
                                                  q=5, 
                                                  labels=['Q1(Lowest)', 'Q2', 'Q3', 'Q4', 'Q5(Highest)'],
                                                  duplicates='drop')
            
            income_prevalence = merged_df.groupby('income_quintile')['stunted'].agg(['mean', 'count']).reset_index()
            
            income_numeric = merged_df['pendapatan_rt'].rank()
            income_correlation = safe_correlation(income_numeric, merged_df['stunted'])
            
            risk_factors.append({
                'factor': 'Kemiskinan Rumah Tangga',
                'correlation': round(income_correlation, 3),
                'impact_description': f'Pendapatan rumah tangga rendah meningkatkan risiko stunting sebesar {round(abs(income_correlation)*100, 1)}%',
                'prevalence_data': income_prevalence.to_dict('records'),
                'total_affected': int((merged_df['stunted'] == 1).sum()),
                'risk_level': 'high' if abs(income_correlation) > 0.4 else 'moderate' if abs(income_correlation) > 0.2 else 'low',
                'chart_type': 'bar',
                'x_axis': 'income_quintile',
                'y_axis': 'stunting_prevalence'
            })
        except:
            pass
    
    # 3. PROGRAM PARTICIPATION EFFECT
    if 'on_program' in merged_df.columns:
        program_analysis = merged_df.groupby('on_program').agg({
            'HAZ': 'mean',
            'stunted': 'mean'
        }).reset_index()
        
        program_effect = merged_df[merged_df['on_program'] == 1]['HAZ'].mean() - merged_df[merged_df['on_program'] == 0]['HAZ'].mean()
        
        risk_factors.append({
            'factor': 'Partisipasi Program Gizi',
            'correlation': round(program_effect / 2, 3),  # Normalize to correlation scale
            'impact_description': f'Partisipasi program meningkatkan HAZ sebesar {program_effect:.2f} standar deviasi',
            'prevalence_data': program_analysis.to_dict('records'),
            'total_affected': int(merged_df[merged_df['on_program'] == 1].shape[0]),
            'risk_level': 'high' if abs(program_effect) > 0.5 else 'moderate' if abs(program_effect) > 0.2 else 'low',
            'chart_type': 'scatter',
            'x_axis': 'program_participation',
            'y_axis': 'avg_haz'
        })
    
    # 4. HOUSEHOLD INFRASTRUCTURE IMPACT
    infrastructure_factors = ['kepemilikan_rumah', 'akses_listrik', 'akses_internet']
    for factor in infrastructure_factors:
        if factor in merged_df.columns:
            factor_analysis = merged_df.groupby(factor)['stunted'].agg(['mean', 'count']).reset_index()
            factor_correlation = safe_correlation(merged_df[factor], merged_df['stunted'])
            
            factor_names = {
                'kepemilikan_rumah': 'Kepemilikan Rumah',
                'akses_listrik': 'Akses Listrik', 
                'akses_internet': 'Akses Internet'
            }
            
            risk_factors.append({
                'factor': factor_names.get(factor, factor),
                'correlation': round(factor_correlation, 3),
                'impact_description': f'{factor_names.get(factor, factor)} menunjukkan korelasi {round(abs(factor_correlation)*100, 1)}% dengan stunting',
                'prevalence_data': factor_analysis.to_dict('records'),
                'total_affected': int((merged_df['stunted'] == 1).sum()),
                'risk_level': 'high' if abs(factor_correlation) > 0.3 else 'moderate' if abs(factor_correlation) > 0.15 else 'low',
                'chart_type': 'bar',
                'x_axis': factor,
                'y_axis': 'stunting_prevalence'
            })
    
    # 5. ENVIRONMENTAL FACTORS (Simulated based on epidemiological evidence)
    np.random.seed(43)  # Different seed for variety
    
    # Water and sanitation access (strong predictor of stunting)
    sanitation_prob = 0.4  # 40% poor sanitation
    merged_df['poor_sanitation'] = np.random.binomial(1, sanitation_prob, len(merged_df))
    
    sanitation_effect = merged_df.groupby('poor_sanitation')['stunted'].mean()
    sanitation_correlation = safe_correlation(merged_df['poor_sanitation'], merged_df['stunted'])
    
    # Handle potential missing values in sanitation_effect
    sanitation_effect_diff = 0.0
    if len(sanitation_effect) >= 2:
        sanitation_effect_diff = safe_float(sanitation_effect.iloc[1]) - safe_float(sanitation_effect.iloc[0])
    
    risk_factors.append({
        'factor': 'Sanitasi Buruk (Simulasi)',
        'correlation': round(sanitation_correlation, 3),
        'impact_description': f'Sanitasi buruk meningkatkan risiko stunting sebesar {round(abs(sanitation_effect_diff)*100, 1)} persen poin',
        'prevalence_data': [
            {'sanitation_status': 'Baik', 'mean': safe_float(sanitation_effect.iloc[0]) if len(sanitation_effect) > 0 else 0.0, 'count': int((merged_df['poor_sanitation'] == 0).sum())},
            {'sanitation_status': 'Buruk', 'mean': safe_float(sanitation_effect.iloc[1]) if len(sanitation_effect) > 1 else 0.0, 'count': int((merged_df['poor_sanitation'] == 1).sum())}
        ],
        'total_affected': int((merged_df['stunted'] == 1).sum()),
        'risk_level': 'high',
        'chart_type': 'bar',
        'x_axis': 'sanitation_status',
        'y_axis': 'stunting_prevalence'
    })
    
    # Maternal education (simulated)
    maternal_edu_prob = [0.5, 0.3, 0.2]  # Primary, Secondary, Higher
    merged_df['maternal_education'] = np.random.choice(['SD', 'SMP', 'SMA'], 
                                                      size=len(merged_df), 
                                                      p=maternal_edu_prob)
    
    edu_prevalence = merged_df.groupby('maternal_education')['stunted'].agg(['mean', 'count']).reset_index()
    
    # Map education to numeric for correlation
    edu_mapping = {'SD': 1, 'SMP': 2, 'SMA': 3}
    merged_df['edu_numeric'] = merged_df['maternal_education'].map(edu_mapping)
    edu_correlation = safe_correlation(merged_df['edu_numeric'], merged_df['stunted'])
    
    risk_factors.append({
        'factor': 'Pendidikan Ibu (Simulasi)',
        'correlation': round(edu_correlation, 3),
        'impact_description': f'Pendidikan ibu yang lebih tinggi mengurangi risiko stunting sebesar {round(abs(edu_correlation)*100, 1)}%',
        'prevalence_data': edu_prevalence.to_dict('records'),
        'total_affected': int((merged_df['stunted'] == 1).sum()),
        'risk_level': 'high' if abs(edu_correlation) > 0.4 else 'moderate' if abs(edu_correlation) > 0.2 else 'low',
        'chart_type': 'bar',
        'x_axis': 'maternal_education',
        'y_axis': 'stunting_prevalence'
    })
    
    return risk_factors

def generate_population_risk_summary(risk_factors, health_outcome):
    """Generate population-level risk factor summary"""
    
    high_risk_factors = [rf for rf in risk_factors if rf['risk_level'] == 'high']
    moderate_risk_factors = [rf for rf in risk_factors if rf['risk_level'] == 'moderate']
    
    # FIX: Don't sum across risk factors - use the base population
    # The 'total_affected' should represent the base population, not cumulative
    total_population_at_risk = risk_factors[0]['total_affected'] if risk_factors else 0
    
    # Calculate composite risk score with safe handling
    risk_scores = [abs(rf['correlation']) for rf in risk_factors if rf['correlation'] != 0 and not pd.isna(rf['correlation'])]
    composite_risk = safe_float(np.mean(risk_scores)) if risk_scores else 0.0
    
    # Identify primary risk factors (top 3 by correlation)
    sorted_factors = sorted(risk_factors, key=lambda x: abs(x['correlation']) if not pd.isna(x['correlation']) else 0, reverse=True)
    primary_risks = [rf['factor'] for rf in sorted_factors[:3]]
    
    # Calculate strongest correlation with safe handling
    correlations = [abs(rf['correlation']) for rf in risk_factors if not pd.isna(rf['correlation'])]
    strongest_correlation = safe_float(max(correlations)) if correlations else 0.0
    
    return {
        'health_outcome': health_outcome,
        'total_risk_factors': len(risk_factors),
        'high_risk_factors': len(high_risk_factors),
        'moderate_risk_factors': len(moderate_risk_factors),
        'population_at_risk': total_population_at_risk,
        'composite_risk_score': round(composite_risk, 3),
        'primary_risk_factors': primary_risks,
        'strongest_correlation': round(strongest_correlation, 3),
        'risk_factor_distribution': {
            'high': len(high_risk_factors),
            'moderate': len(moderate_risk_factors), 
            'low': len(risk_factors) - len(high_risk_factors) - len(moderate_risk_factors)
        }
    }

def safe_serialize_dict(data_dict):
    """Safely serialize dictionary containing pandas/numpy objects to JSON-compatible types"""
    if data_dict is None:
        return None
    
    if isinstance(data_dict, (list, tuple)):
        return [safe_serialize_dict(item) for item in data_dict]
    
    if not isinstance(data_dict, dict):
        # Handle individual values
        if isinstance(data_dict, pd.Interval):
            return str(data_dict)
        elif hasattr(data_dict, 'item'):  # numpy scalars
            return data_dict.item()
        elif isinstance(data_dict, np.ndarray):
            return data_dict.tolist()
        elif isinstance(data_dict, pd.Series):
            return data_dict.to_dict()
        elif isinstance(data_dict, pd.DataFrame):
            return data_dict.to_dict('records')
        elif pd.isna(data_dict):
            return None
        elif isinstance(data_dict, (int, float, str, bool)):
            return data_dict
        else:
            return str(data_dict)
    
    serialized = {}
    for key, value in data_dict.items():
        if isinstance(value, pd.Interval):
            # Convert pandas Interval to string representation
            serialized[key] = str(value)
        elif hasattr(value, 'item'):  # numpy scalars
            serialized[key] = value.item()
        elif isinstance(value, np.ndarray):
            serialized[key] = value.tolist()
        elif isinstance(value, pd.Series):
            serialized[key] = value.to_dict()
        elif isinstance(value, pd.DataFrame):
            serialized[key] = value.to_dict('records')
        elif hasattr(value, '__len__') and len(value) == 1 and pd.isna(value).any():
            # Handle single-element arrays that are NaN
            serialized[key] = None
        elif not hasattr(value, '__len__') and pd.isna(value):
            # Handle scalar NaN values
            serialized[key] = None
        elif isinstance(value, dict):
            serialized[key] = safe_serialize_dict(value)
        elif isinstance(value, (list, tuple)):
            serialized[key] = [safe_serialize_dict(item) for item in value]
        elif isinstance(value, (int, float, str, bool)):
            serialized[key] = value
        else:
            serialized[key] = str(value)
    
    return serialized

# Response models
class RiskFactorData(BaseModel):
    factor: str
    correlation: float
    impact_description: str
    prevalence_data: List[Dict[str, Any]]
    total_affected: int
    risk_level: str
    chart_type: str
    x_axis: str
    y_axis: str

class PopulationRiskSummary(BaseModel):
    health_outcome: str
    total_risk_factors: int
    high_risk_factors: int
    moderate_risk_factors: int
    population_at_risk: int
    composite_risk_score: float
    primary_risk_factors: List[str]
    strongest_correlation: float
    risk_factor_distribution: Dict[str, int]

class HypertensionMetrics(BaseModel):
    total_adults: int
    adults_on_treatment: int
    participation_rate: float
    avg_bp_reduction: float
    program_cost: float
    cost_per_participant: float

class StuntingMetrics(BaseModel):
    total_children: int
    children_on_program: int
    participation_rate: float
    avg_haz_improvement: float
    program_cost: float
    cost_per_participant: float

class TrendData(BaseModel):
    dates: List[str]
    values: List[float]
    metric_name: str

class SeparatedDashboardResponse(BaseModel):
    hypertension_section: Dict[str, Any]
    stunting_section: Dict[str, Any]
    combined_metrics: Dict[str, Any]
    hypertension_risk_factors: List[RiskFactorData]
    stunting_risk_factors: List[RiskFactorData]
    population_risk_summary: Dict[str, Any]
    alerts: List[str]
    time_info: Dict[str, Any]

# =============================================================================
# OVERALL DASHBOARD MODULE
# =============================================================================

@app.get("/dashboard/overall", response_model=SeparatedDashboardResponse, tags=["Dashboard"])
async def get_overall_dashboard(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    time_period: Optional[str] = Query("1", description="Time period in months (1, 3, or 12)"),
    use_database: bool = Query(False, description="Use database instead of CSV files"),
    db: Session = Depends(get_db)
):
    """
    Get overall system-wide dashboard metrics with separated hypertension and stunting sections
    """
    try:
        if use_database:
            # Query from database
            adults_query = db.query(AdultRecord)
            children_query = db.query(ChildRecord)
            programs_query = db.query(ProgramRecord)
            households_query = db.query(HouseholdRecord)
            
            # Apply date filters if provided
            if start_date:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                adults_query = adults_query.filter(AdultRecord.date >= start_dt)
                children_query = children_query.filter(ChildRecord.date >= start_dt)
                programs_query = programs_query.filter(ProgramRecord.tanggal >= start_dt)
            
            if end_date:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                adults_query = adults_query.filter(AdultRecord.date <= end_dt)
                children_query = children_query.filter(ChildRecord.date <= end_dt)
                programs_query = programs_query.filter(ProgramRecord.tanggal <= end_dt)
            
            # Convert to pandas DataFrames for compatibility with existing logic
            adults_records = adults_query.all()
            children_records = children_query.all()
            program_records = programs_query.all()
            household_records = households_query.all()
            
            # Convert to DataFrame format
            adults_df = pd.DataFrame([{
                'person_id': r.person_id,
                'household_id': r.household_id,
                'date': r.date,
                'month': r.month,
                'age': r.age,
                'sistol': r.sistol,
                'diastol': r.diastol,
                'on_treatment': r.on_treatment,
                'diabetes_koin': r.diabetes_koin,
                'perokok': r.perokok,
                'adherence_current': r.adherence_current
            } for r in adults_records])
            
            children_df = pd.DataFrame([{
                'child_id': r.child_id,
                'household_id': r.household_id,
                'date': r.date,
                'month': r.month,
                'usia_bulan': r.usia_bulan,
                'HAZ': r.HAZ,
                'on_program': r.on_program,
                'anemia_hb_gdl': r.anemia_hb_gdl,
                'air_bersih': r.air_bersih,
                'jamban_sehat': r.jamban_sehat,
                'haz_change_this_month': r.haz_change_this_month
            } for r in children_records])
            
            program_log = pd.DataFrame([{
                'program': r.program,
                'target_id': r.target_id,
                'household_id': r.household_id,
                'tanggal': r.tanggal,
                'biaya_riil': r.biaya_riil,
                'status': r.status,
                'description': r.description
            } for r in program_records])
            
            households_df = pd.DataFrame([{
                'household_id': r.household_id,
                'pendapatan_rt': r.pendapatan_rt,
                'kepemilikan_rumah': r.kepemilikan_rumah,
                'akses_listrik': r.akses_listrik,
                'akses_internet': r.akses_internet
            } for r in household_records])
            
        else:
            # Use existing CSV data
            adults_df = data_cache['adults'].copy()
            children_df = data_cache['children'].copy()
            program_log = data_cache['program_log'].copy()
            households_df = data_cache['households'].copy()
        
        # Parse time period (accept numeric months like 1,3,12,24,36)
        try:
            period_months = int(time_period) if time_period and str(time_period).isdigit() and int(time_period) > 0 else 1
        except Exception:
            period_months = 1

        # Determine default end_date/start_date from the actual data (works for DB and CSV modes)
        if not end_date:
            latest_adult_date = adults_df['date'].max() if not adults_df.empty else pd.Timestamp('2023-12-31')
            latest_children_date = children_df['date'].max() if not children_df.empty else pd.Timestamp('2023-12-31')
            latest_program_date = program_log['tanggal'].max() if not program_log.empty else pd.Timestamp('2023-12-31')
            data_end_date = max(latest_adult_date, latest_children_date, latest_program_date)
            end_date = pd.to_datetime(data_end_date).strftime('%Y-%m-%d')

        if not start_date:
            end_dt = pd.to_datetime(end_date)
            # Approximate months by 30 days each (sufficient for dashboard windows)
            start_dt = end_dt - timedelta(days=period_months * 30)
            start_date = start_dt.strftime('%Y-%m-%d')
        
        # Apply date filters
        start_dt = pd.to_datetime(start_date)
        end_dt = pd.to_datetime(end_date)
        
        adults_df = adults_df[(adults_df['date'] >= start_dt) & (adults_df['date'] <= end_dt)]
        children_df = children_df[(children_df['date'] >= start_dt) & (children_df['date'] <= end_dt)]
        program_log = program_log[(program_log['tanggal'] >= start_dt) & (program_log['tanggal'] <= end_dt)]
        
        # ========== HYPERTENSION SECTION ==========
        htn_total = adults_df['person_id'].nunique()
        htn_participants = adults_df[adults_df['on_treatment'] == 1]['person_id'].nunique()
        htn_participation_rate = htn_participants / htn_total if htn_total > 0 else 0
        
        # Calculate BP improvement
        baseline_bp = adults_df[adults_df['month'] == 0].groupby('person_id')['sistol'].first()
        latest_bp = adults_df.groupby('person_id')['sistol'].last()
        bp_improvement = (baseline_bp - latest_bp).mean()
        bp_improvement = safe_float(bp_improvement, 0)

        # HTN program costs
        htn_program_log = program_log[program_log['program'].str.contains('htn|hypertension|tension', case=False, na=False)]
        htn_total_cost = safe_float(htn_program_log['biaya_riil'].sum(), 0)
        htn_cost_per_participant = safe_float(htn_total_cost / htn_participants, 0) if htn_participants > 0 else 0
        
        # HTN age distribution (adults 18+)
        htn_age_dist = {}
        if len(adults_df) > 0:
            # Adult-specific age bins (18-30, 31-45, 46-60, 61+)
            age_bins = pd.cut(adults_df['age'], bins=[17, 30, 45, 60, 100], labels=['18-30', '31-45', '46-60', '61+'])
            age_distribution = adults_df.groupby(age_bins)['person_id'].nunique()
            htn_age_dist = {str(k): int(v) for k, v in age_distribution.items() if not pd.isna(k)}
        
        # HTN trends
        htn_trends = []
        monthly_bp = adults_df.groupby(adults_df['date'].dt.to_period('M'))['sistol'].mean()
        if len(monthly_bp) > 0:
            htn_trends.append({
                "dates": [str(d) for d in monthly_bp.index],
                "values": safe_float_list(monthly_bp.values),
                "metric_name": "avg_blood_pressure"
            })
        
        monthly_htn_participation = adults_df.groupby(adults_df['date'].dt.to_period('M'))['on_treatment'].mean()
        if len(monthly_htn_participation) > 0:
            htn_trends.append({
                "dates": [str(d) for d in monthly_htn_participation.index],
                "values": safe_float_list(monthly_htn_participation.values),
                "metric_name": "htn_participation_rate"
            })
        
        hypertension_metrics = HypertensionMetrics(
            total_adults=int(htn_total),
            adults_on_treatment=int(htn_participants),
            participation_rate=safe_float(htn_participation_rate, 0),
            avg_bp_reduction=safe_float(bp_improvement, 0),
            program_cost=safe_float(htn_total_cost, 0),
            cost_per_participant=safe_float(htn_cost_per_participant, 0)
        )
        
        # ========== STUNTING SECTION ==========
        stunting_total = children_df['child_id'].nunique()
        stunting_participants = children_df[children_df['on_program'] == 1]['child_id'].nunique()
        stunting_participation_rate = stunting_participants / stunting_total if stunting_total > 0 else 0
        
        # Calculate HAZ improvement
        haz_improvement = safe_float(children_df['haz_change_this_month'].mean(), 0)
        
        # Stunting program costs
        stunting_program_log = program_log[program_log['program'].str.contains('stunt|gizi|nutrition', case=False, na=False)]
        stunting_total_cost = safe_float(stunting_program_log['biaya_riil'].sum(), 0)
        stunting_cost_per_participant = safe_float(stunting_total_cost / stunting_participants, 0) if stunting_participants > 0 else 0
        
        # Stunting age distribution (children 0-5 years)
        stunting_age_dist = {}
        if len(children_df) > 0:
            # Child-specific age bins (0-6m, 6-12m, 1-2y, 2-3y, 3-5y)
            age_bins = pd.cut(children_df['usia_bulan'], bins=[0, 6, 12, 24, 36, 60], labels=['0-6m', '6-12m', '1-2y', '2-3y', '3-5y'])
            age_distribution = children_df.groupby(age_bins)['child_id'].nunique()
            stunting_age_dist = {str(k): int(v) for k, v in age_distribution.items() if not pd.isna(k)}
        
        # Stunting trends
        stunting_trends = []
        monthly_haz = children_df.groupby(children_df['date'].dt.to_period('M'))['HAZ'].mean()
        if len(monthly_haz) > 0:
            stunting_trends.append({
                "dates": [str(d) for d in monthly_haz.index],
                "values": safe_float_list(monthly_haz.values),
                "metric_name": "avg_haz_score"
            })
        
        monthly_stunting_participation = children_df.groupby(children_df['date'].dt.to_period('M'))['on_program'].mean()
        if len(monthly_stunting_participation) > 0:
            stunting_trends.append({
                "dates": [str(d) for d in monthly_stunting_participation.index],
                "values": safe_float_list(monthly_stunting_participation.values),
                "metric_name": "stunting_participation_rate"
            })
        
        stunting_metrics = StuntingMetrics(
            total_children=int(stunting_total),
            children_on_program=int(stunting_participants),
            participation_rate=safe_float(stunting_participation_rate, 0),
            avg_haz_improvement=safe_float(haz_improvement, 0),
            program_cost=safe_float(stunting_total_cost, 0),
            cost_per_participant=safe_float(stunting_cost_per_participant, 0)
        )
        
        # ========== COMBINED METRICS ==========
        total_program_cost = safe_float(program_log['biaya_riil'].sum(), 0)
        total_participants = htn_total + stunting_total
        total_program_participants = htn_participants + stunting_participants
        overall_participation_rate = safe_float(total_program_participants / total_participants, 0) if total_participants > 0 else 0
        
        # Program distribution
        program_distribution = program_log['program'].value_counts().to_dict()
        program_dist_clean = {str(k): int(v) for k, v in program_distribution.items()}
        
        # Monthly cost trends for all programs
        monthly_costs = program_log.groupby(program_log['tanggal'].dt.to_period('M'))['biaya_riil'].sum()
        cost_trends = []
        if len(monthly_costs) > 0:
            cost_trends.append({
                "dates": [str(d) for d in monthly_costs.index],
                "values": safe_float_list(monthly_costs.values),
                "metric_name": "monthly_total_costs"
            })
        
        combined_metrics = {
            "total_participants": int(total_participants),
            "total_program_participants": int(total_program_participants),
            "overall_participation_rate": safe_float(overall_participation_rate, 0),
            "total_program_cost": safe_float(total_program_cost, 0),
            "program_distribution": program_dist_clean,
            "cost_trends": cost_trends
        }
        
        # ========== RISK FACTOR ANALYSIS ==========
        # For database mode, use simplified risk analysis with available fields only
        # For CSV mode, use full risk analysis
        if use_database:
            # Simplified risk analysis using only available database fields
            htn_risk_factors = []
            stunting_risk_factors = []
            
            # Basic age analysis for hypertension
            if not adults_df.empty:
                age_correlation = safe_correlation(adults_df['age'], 
                                                 (adults_df['sistol'] >= 140).astype(int))
                htn_risk_factors.append({
                    'factor': 'Age Factor',
                    'correlation': round(age_correlation, 3),
                    'impact_description': f'Age shows {round(abs(age_correlation)*100, 1)}% correlation with hypertension',
                    'prevalence_data': [],
                    'total_affected': int((adults_df['sistol'] >= 140).sum()),
                    'risk_level': 'moderate',
                    'chart_type': 'scatter',
                    'x_axis': 'age',
                    'y_axis': 'hypertension_risk'
                })
            
            # Basic age analysis for stunting
            if not children_df.empty:
                stunting_correlation = safe_correlation(children_df['usia_bulan'], 
                                                       (children_df['HAZ'] < -2).astype(int))
                stunting_risk_factors.append({
                    'factor': 'Age Factor',
                    'correlation': round(stunting_correlation, 3),
                    'impact_description': f'Age shows {round(abs(stunting_correlation)*100, 1)}% correlation with stunting',
                    'prevalence_data': [],
                    'total_affected': int((children_df['HAZ'] < -2).sum()),
                    'risk_level': 'moderate',
                    'chart_type': 'scatter',
                    'x_axis': 'age_months',
                    'y_axis': 'stunting_risk'
                })
            
            # Generate simplified risk summaries
            htn_risk_summary = {
                'health_outcome': 'hypertension',
                'total_risk_factors': len(htn_risk_factors),
                'high_risk_factors': 0,
                'moderate_risk_factors': len(htn_risk_factors),
                'population_at_risk': len(htn_risk_factors) > 0 and htn_risk_factors[0]['total_affected'] or 0,
                'composite_risk_score': 0.3,
                'primary_risk_factors': ['Age Factor'],
                'strongest_correlation': len(htn_risk_factors) > 0 and abs(htn_risk_factors[0]['correlation']) or 0.0,
                'risk_factor_distribution': {'high': 0, 'moderate': len(htn_risk_factors), 'low': 0}
            }
            
            stunting_risk_summary = {
                'health_outcome': 'stunting',
                'total_risk_factors': len(stunting_risk_factors),
                'high_risk_factors': 0,
                'moderate_risk_factors': len(stunting_risk_factors),
                'population_at_risk': len(stunting_risk_factors) > 0 and stunting_risk_factors[0]['total_affected'] or 0,
                'composite_risk_score': 0.3,
                'primary_risk_factors': ['Age Factor'],
                'strongest_correlation': len(stunting_risk_factors) > 0 and abs(stunting_risk_factors[0]['correlation']) or 0.0,
                'risk_factor_distribution': {'high': 0, 'moderate': len(stunting_risk_factors), 'low': 0}
            }
        else:
            # Use full CSV-based risk analysis with all available household data
            htn_risk_factors = analyze_hypertension_risk_factors(adults_df, data_cache['households'])
            htn_risk_summary = generate_population_risk_summary(htn_risk_factors, 'hypertension')
            
            stunting_risk_factors = analyze_stunting_risk_factors(children_df, data_cache['households'])
            stunting_risk_summary = generate_population_risk_summary(stunting_risk_factors, 'stunting')
        
        # Combined population risk summary
        combined_risk_summary = {
            'hypertension_summary': htn_risk_summary,
            'stunting_summary': stunting_risk_summary,
            'total_population_at_risk': htn_risk_summary['population_at_risk'] + stunting_risk_summary['population_at_risk'],
            'priority_interventions': [
                'Address socioeconomic disparities',
                'Improve household infrastructure', 
                'Target high-risk age groups',
                'Enhance program participation'
            ]
        }
        
        # ========== ALERTS ==========
        alerts = []
        if htn_participation_rate < 0.5:
            alerts.append("⚠️ Tingkat partisipasi program hipertensi rendah")
        if stunting_participation_rate < 0.5:
            alerts.append("⚠️ Tingkat partisipasi program stunting rendah")
        if bp_improvement < 0:
            alerts.append("🔴 Tren tekanan darah menunjukkan penurunan")
        if haz_improvement < 0:
            alerts.append("🔴 Tren skor HAZ menunjukkan penurunan")
        if htn_cost_per_participant > 300000:
            alerts.append("💰 Biaya per partisipan hipertensi tinggi")
        if stunting_cost_per_participant > 200000:
            alerts.append("💰 Biaya per partisipan stunting tinggi")
        
        # Add risk factor alerts
        high_risk_htn = [rf for rf in htn_risk_factors if rf['risk_level'] == 'high']
        high_risk_stunting = [rf for rf in stunting_risk_factors if rf['risk_level'] == 'high']
        
        if len(high_risk_htn) >= 3:
            alerts.append(f"🚨 {len(high_risk_htn)} faktor risiko tinggi teridentifikasi untuk hipertensi")
        if len(high_risk_stunting) >= 3:
            alerts.append(f"🚨 {len(high_risk_stunting)} faktor risiko tinggi teridentifikasi untuk stunting")
            
        return SeparatedDashboardResponse(
            hypertension_section={
                "metrics": hypertension_metrics.dict(),
                "age_distribution": htn_age_dist,
                "trends": htn_trends,
                "cost_analysis": {
                    "total_cost": safe_float(htn_total_cost, 0),
                    "cost_per_participant": safe_float(htn_cost_per_participant, 0),
                    "cost_effectiveness": safe_float(htn_cost_per_participant / abs(bp_improvement), 0) if abs(bp_improvement) > 0.001 else 0
                }
            },
            stunting_section={
                "metrics": stunting_metrics.dict(),
                "age_distribution": stunting_age_dist,
                "trends": stunting_trends,
                "cost_analysis": {
                    "total_cost": safe_float(stunting_total_cost, 0),
                    "cost_per_participant": safe_float(stunting_cost_per_participant, 0),
                    "cost_effectiveness": safe_float(stunting_cost_per_participant / abs(haz_improvement), 0) if abs(haz_improvement) > 0.001 else 0
                }
            },
            combined_metrics=combined_metrics,
            hypertension_risk_factors=[RiskFactorData(**rf) for rf in htn_risk_factors],
            stunting_risk_factors=[RiskFactorData(**rf) for rf in stunting_risk_factors],
            population_risk_summary=combined_risk_summary,
            alerts=alerts,
            time_info={
                "period_months": period_months,
                "start_date": start_date,
                "end_date": end_date,
                "current_date": end_date,  # Use data end date instead of system date
                "period_label": f"{period_months} Month{'s' if period_months > 1 else ''}"
            }
        )
        
    except Exception as e:
        print(f"Error in overall dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam menghasilkan dasbor keseluruhan: {str(e)}")

# =============================================================================
# PER-DUSUN DASHBOARD MODULE
# =============================================================================

@app.get("/dashboard/dusun/{dusun_id}", response_model=SeparatedDashboardResponse)
async def get_dusun_dashboard(
    dusun_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    time_period: Optional[str] = Query("1", description="Time period in months (1, 3, or 12)")
):
    """
    Get dashboard metrics for a specific dusun (village area) with separated hypertension and stunting sections
    """
    try:
        # For demo purposes, we'll simulate dusun filtering by household groups
        households_df = data_cache['households'].copy()
        
        # Simulate dusun mapping (group households by income quartiles as proxy for geographical areas)
        # Use pd.qcut with duplicates='drop' to handle duplicate income values
        try:
            income_quartiles = pd.qcut(households_df['pendapatan_rt'], q=4, labels=['Dusun_A', 'Dusun_B', 'Dusun_C', 'Dusun_D'], duplicates='drop')
        except ValueError:
            # If qcut still fails, use simple binning based on income ranges
            income_values = households_df['pendapatan_rt']
            min_income, max_income = income_values.min(), income_values.max()
            income_range = max_income - min_income
            
            # Create manual bins to ensure uniqueness
            bins = [
                min_income - 1,
                min_income + income_range * 0.25,
                min_income + income_range * 0.50,
                min_income + income_range * 0.75,
                max_income + 1
            ]
            income_quartiles = pd.cut(households_df['pendapatan_rt'], bins=bins, labels=['Dusun_A', 'Dusun_B', 'Dusun_C', 'Dusun_D'])
        
        households_df['dusun'] = income_quartiles
        
        # Filter households for specific dusun
        dusun_households = households_df[households_df['dusun'] == dusun_id]['household_id'].tolist()
        
        if not dusun_households:
            raise HTTPException(status_code=404, detail=f"Dusun {dusun_id} tidak ditemukan")
        
        # Filter data for this dusun
        adults_df = data_cache['adults'][data_cache['adults']['household_id'].isin(dusun_households)].copy()
        children_df = data_cache['children'][data_cache['children']['household_id'].isin(dusun_households)].copy()
        program_log = data_cache['program_log'][
            data_cache['program_log']['target_id'].isin(
                adults_df['person_id'].tolist() + children_df['child_id'].tolist() + dusun_households
            )
        ].copy()
        
        # Parse time period and apply date filters
        period_months = int(time_period) if time_period in ["1", "3", "12"] else 1
        
        # Calculate date range based on actual data dates, not current date
        if not end_date:
            # Use the latest date from the actual data
            latest_adult_date = adults_df['date'].max() if not adults_df.empty else pd.Timestamp('2023-12-31')
            latest_children_date = children_df['date'].max() if not children_df.empty else pd.Timestamp('2023-12-31')
            latest_program_date = program_log['tanggal'].max() if not program_log.empty else pd.Timestamp('2023-12-31')
            
            # Use the latest date across all datasets
            data_end_date = max(latest_adult_date, latest_children_date, latest_program_date)
            end_date = data_end_date.strftime('%Y-%m-%d')
            
        if not start_date:
            end_dt = pd.to_datetime(end_date)
            start_dt = end_dt - timedelta(days=period_months * 30)
            start_date = start_dt.strftime('%Y-%m-%d')
        
        # Apply date filters
        start_dt = pd.to_datetime(start_date)
        end_dt = pd.to_datetime(end_date)
        
        adults_df = adults_df[(adults_df['date'] >= start_dt) & (adults_df['date'] <= end_dt)]
        children_df = children_df[(children_df['date'] >= start_dt) & (children_df['date'] <= end_dt)]
        program_log = program_log[(program_log['tanggal'] >= start_dt) & (program_log['tanggal'] <= end_dt)]
        
        # Calculate dusun-specific metrics
        total_adults = adults_df['person_id'].nunique()
        total_children = children_df['child_id'].nunique()
        
        htn_participants = adults_df[adults_df['on_treatment'] == 1]['person_id'].nunique()
        stunting_participants = children_df[children_df['on_program'] == 1]['child_id'].nunique()
        
        # ========== HYPERTENSION SECTION FOR DUSUN ==========
        htn_participation_rate = htn_participants / total_adults if total_adults > 0 else 0
        
        # Health outcomes
        baseline_bp = adults_df[adults_df['month'] == 0].groupby('person_id')['sistol'].first()
        latest_bp = adults_df.groupby('person_id')['sistol'].last()
        bp_improvement = (baseline_bp - latest_bp).mean()
        if pd.isna(bp_improvement):
            bp_improvement = 0
        
        # HTN costs for this dusun
        htn_program_log = program_log[program_log['program'].str.contains('htn|hypertension|tension', case=False, na=False)]
        htn_cost = htn_program_log['biaya_riil'].sum()
        htn_cost_per_participant = htn_cost / htn_participants if htn_participants > 0 else 0
        
        # HTN age distribution
        htn_age_dist = {}
        if len(adults_df) > 0:
            age_bins = pd.cut(adults_df['age'], bins=[17, 30, 45, 60, 100], labels=['18-30', '31-45', '46-60', '61+'])
            age_distribution = adults_df.groupby(age_bins)['person_id'].nunique()
            htn_age_dist = {str(k): int(v) for k, v in age_distribution.items() if not pd.isna(k)}
        
        # HTN trends
        htn_trends = []
        if len(adults_df) > 0:
            weekly_bp = adults_df.groupby(adults_df['date'].dt.to_period('W'))['sistol'].mean()
            if len(weekly_bp) > 0:
                htn_trends.append({
                    "dates": [str(d) for d in weekly_bp.index],
                    "values": [float(v) for v in weekly_bp.values],
                    "metric_name": "avg_blood_pressure"
                })
        
        hypertension_metrics = HypertensionMetrics(
            total_adults=int(total_adults),
            adults_on_treatment=int(htn_participants),
            participation_rate=float(round(htn_participation_rate, 3)),
            avg_bp_reduction=float(round(bp_improvement, 2)),
            program_cost=float(int(htn_cost)),
            cost_per_participant=float(int(htn_cost_per_participant))
        )
        
        # ========== STUNTING SECTION FOR DUSUN ==========
        stunting_participation_rate = stunting_participants / total_children if total_children > 0 else 0
        
        haz_improvement = children_df['haz_change_this_month'].mean()
        if pd.isna(haz_improvement):
            haz_improvement = 0
        
        # Stunting costs for this dusun
        stunting_program_log = program_log[program_log['program'].str.contains('stunt|gizi|nutrition', case=False, na=False)]
        stunting_cost = stunting_program_log['biaya_riil'].sum()
        stunting_cost_per_participant = stunting_cost / stunting_participants if stunting_participants > 0 else 0
        
        # Stunting age distribution
        stunting_age_dist = {}
        if len(children_df) > 0:
            age_bins = pd.cut(children_df['usia_bulan'], bins=[0, 6, 12, 24, 36, 60], labels=['0-6m', '6-12m', '1-2y', '2-3y', '3-5y'])
            age_distribution = children_df.groupby(age_bins)['child_id'].nunique()
            stunting_age_dist = {str(k): int(v) for k, v in age_distribution.items() if not pd.isna(k)}
        
        # Stunting trends
        stunting_trends = []
        if len(children_df) > 0:
            weekly_haz = children_df.groupby(children_df['date'].dt.to_period('W'))['HAZ'].mean()
            if len(weekly_haz) > 0:
                stunting_trends.append({
                    "dates": [str(d) for d in weekly_haz.index],
                    "values": [float(v) for v in weekly_haz.values],
                    "metric_name": "avg_haz_score"
                })
        
        stunting_metrics = StuntingMetrics(
            total_children=int(total_children),
            children_on_program=int(stunting_participants),
            participation_rate=float(round(stunting_participation_rate, 3)),
            avg_haz_improvement=float(round(haz_improvement, 3)),
            program_cost=float(int(stunting_cost)),
            cost_per_participant=float(int(stunting_cost_per_participant))
        )
        
        # ========== COMBINED METRICS FOR DUSUN ==========
        total_participants = total_adults + total_children
        program_participants = htn_participants + stunting_participants
        overall_participation_rate = program_participants / total_participants if total_participants > 0 else 0
        total_cost = program_log['biaya_riil'].sum()
        
        program_distribution = {}
        if len(program_log) > 0:
            program_distribution = program_log['program'].value_counts().to_dict()
            program_distribution = {str(k): int(v) for k, v in program_distribution.items()}
        
        combined_metrics = {
            "total_participants": int(total_participants),
            "total_program_participants": int(program_participants),
            "overall_participation_rate": float(round(overall_participation_rate, 3)),
            "total_program_cost": float(int(total_cost)),
            "household_count": len(dusun_households),
            "program_distribution": program_distribution
        }
        
        # Dusun-specific alerts
        alerts = []
        if len(dusun_households) < 5:
            alerts.append("📍 Small dusun - limited statistical power")
        if htn_participation_rate < 0.3:
            alerts.append("⚠️ Very low hypertension program participation in this dusun")
        if stunting_participation_rate < 0.3:
            alerts.append("⚠️ Very low stunting program participation in this dusun")
        if total_cost / len(dusun_households) > 200000:
            alerts.append("💰 High cost per household in this dusun")

        # Generate risk factors for this dusun
        # Note: Risk factors are provided through dedicated endpoints, 
        # so we provide empty lists here to satisfy the schema
        hypertension_risk_data = []
        stunting_risk_data = []
        
        # Population risk summary
        population_risk_summary = {
            "total_population": int(total_participants),
            "high_risk_population": int(adults_df[adults_df['sistol'] > 140]['person_id'].nunique() + 
                                      children_df[children_df['HAZ'] < -2]['child_id'].nunique()),
            "program_coverage": float(round(overall_participation_rate, 3)),
            "risk_factors_identified": 0,  # Placeholder since risk factors use dedicated endpoints
            "geographic_scope": f"Dusun {dusun_id}",
            "households_covered": len(dusun_households)
        }
            
        return SeparatedDashboardResponse(
            hypertension_section={
                "metrics": hypertension_metrics.dict(),
                "age_distribution": htn_age_dist,
                "trends": htn_trends,
                "cost_analysis": {
                    "total_cost": float(int(htn_cost)),
                    "cost_per_participant": float(int(htn_cost_per_participant)),
                    "cost_effectiveness": float(htn_cost_per_participant / abs(bp_improvement)) if bp_improvement != 0 else 0
                }
            },
            stunting_section={
                "metrics": stunting_metrics.dict(),
                "age_distribution": stunting_age_dist,
                "trends": stunting_trends,
                "cost_analysis": {
                    "total_cost": float(int(stunting_cost)),
                    "cost_per_participant": float(int(stunting_cost_per_participant)),
                    "cost_effectiveness": float(stunting_cost_per_participant / abs(haz_improvement)) if haz_improvement != 0 else 0
                }
            },
            combined_metrics=combined_metrics,
            hypertension_risk_factors=hypertension_risk_data,
            stunting_risk_factors=stunting_risk_data,
            population_risk_summary=population_risk_summary,
            alerts=alerts,
            time_info={
                "period_months": period_months,
                "start_date": start_date,
                "end_date": end_date,
                "current_date": end_date,  # Use data end date instead of system date
                "period_label": f"{period_months} Month{'s' if period_months > 1 else ''}",
                "dusun_id": dusun_id
            }
        )
        
    except Exception as e:
        print(f"Error in dusun dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam menghasilkan dasbor dusun: {str(e)}")

# =============================================================================
# PER-HOUSEHOLD DASHBOARD MODULE
# =============================================================================

@app.get("/dashboard/household/{household_id}", response_model=SeparatedDashboardResponse)
async def get_household_dashboard(
    household_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    time_period: Optional[str] = Query("1", description="Time period in months (1, 3, or 12)")
):
    """
    Get dashboard metrics for a specific household with separated hypertension and stunting sections
    """
    try:
        # Get household info
        household_info = data_cache['households'][data_cache['households']['household_id'] == household_id]
        if household_info.empty:
            raise HTTPException(status_code=404, detail=f"Rumah tangga {household_id} tidak ditemukan")
        
        household_info = household_info.iloc[0]
        
        # Filter data for this household
        adults_df = data_cache['adults'][data_cache['adults']['household_id'] == household_id].copy()
        children_df = data_cache['children'][data_cache['children']['household_id'] == household_id].copy()
        program_log = data_cache['program_log'][
            data_cache['program_log']['target_id'].isin(
                adults_df['person_id'].tolist() + children_df['child_id'].tolist() + [household_id]
            )
        ].copy()
        
        # Parse time period and apply date filters
        period_months = int(time_period) if time_period in ["1", "3", "12"] else 1
        
        # Calculate date range based on actual data dates, not current date
        if not end_date:
            # Use the latest date from the actual data
            latest_adult_date = adults_df['date'].max() if not adults_df.empty else pd.Timestamp('2023-12-31')
            latest_children_date = children_df['date'].max() if not children_df.empty else pd.Timestamp('2023-12-31')
            latest_program_date = program_log['tanggal'].max() if not program_log.empty else pd.Timestamp('2023-12-31')
            
            # Use the latest date across all datasets
            data_end_date = max(latest_adult_date, latest_children_date, latest_program_date)
            end_date = data_end_date.strftime('%Y-%m-%d')
            
        if not start_date:
            end_dt = pd.to_datetime(end_date)
            start_dt = end_dt - timedelta(days=period_months * 30)
            start_date = start_dt.strftime('%Y-%m-%d')
        
        # Apply date filters
        start_dt = pd.to_datetime(start_date)
        end_dt = pd.to_datetime(end_date)
        
        adults_df = adults_df[(adults_df['date'] >= start_dt) & (adults_df['date'] <= end_dt)]
        children_df = children_df[(children_df['date'] >= start_dt) & (children_df['date'] <= end_dt)]
        program_log = program_log[(program_log['tanggal'] >= start_dt) & (program_log['tanggal'] <= end_dt)]
        
        # Calculate household-specific metrics
        total_adults = adults_df['person_id'].nunique()
        total_children = children_df['child_id'].nunique()
        
        htn_participants = adults_df[adults_df['on_treatment'] == 1]['person_id'].nunique()
        stunting_participants = children_df[children_df['on_program'] == 1]['child_id'].nunique()
        
        # ========== HYPERTENSION SECTION FOR HOUSEHOLD ==========
        htn_participation_rate = htn_participants / total_adults if total_adults > 0 else 0
        
        # Health outcomes for household members
        if not adults_df.empty:
            baseline_bp = adults_df[adults_df['month'] == 0].groupby('person_id')['sistol'].first()
            latest_bp = adults_df.groupby('person_id')['sistol'].last()
            bp_improvement = (baseline_bp - latest_bp).mean()
            if pd.isna(bp_improvement):
                bp_improvement = 0
        else:
            bp_improvement = 0
        
        # HTN costs for this household
        htn_program_log = program_log[program_log['program'].str.contains('htn|hypertension|tension', case=False, na=False)]
        htn_cost = htn_program_log['biaya_riil'].sum()
        htn_cost_per_participant = htn_cost / htn_participants if htn_participants > 0 else 0
        
        # HTN age distribution for household
        htn_age_dist = {}
        if len(adults_df) > 0:
            age_bins = pd.cut(adults_df['age'], bins=[17, 30, 45, 60, 100], labels=['18-30', '31-45', '46-60', '61+'])
            age_distribution = adults_df.groupby(age_bins)['person_id'].nunique()
            htn_age_dist = {str(k): int(v) for k, v in age_distribution.items() if not pd.isna(k)}
        
        # HTN trends for household
        htn_trends = []
        if not adults_df.empty:
            daily_bp = adults_df.groupby('date')['sistol'].mean()
            if len(daily_bp) > 0:
                htn_trends.append({
                    "dates": [d.strftime('%Y-%m-%d') for d in daily_bp.index],
                    "values": [float(v) for v in daily_bp.values],
                    "metric_name": "household_avg_bp"
                })
        
        hypertension_metrics = HypertensionMetrics(
            total_adults=int(total_adults),
            adults_on_treatment=int(htn_participants),
            participation_rate=float(round(htn_participation_rate, 3)),
            avg_bp_reduction=float(round(bp_improvement, 2)),
            program_cost=float(int(htn_cost)),
            cost_per_participant=float(int(htn_cost_per_participant))
        )
        
        # ========== STUNTING SECTION FOR HOUSEHOLD ==========
        stunting_participation_rate = stunting_participants / total_children if total_children > 0 else 0
        
        if not children_df.empty:
            haz_improvement = children_df['haz_change_this_month'].mean()
            if pd.isna(haz_improvement):
                haz_improvement = 0
        else:
            haz_improvement = 0
        
        # Stunting costs for this household
        stunting_program_log = program_log[program_log['program'].str.contains('stunt|gizi|nutrition', case=False, na=False)]
        stunting_cost = stunting_program_log['biaya_riil'].sum()
        stunting_cost_per_participant = stunting_cost / stunting_participants if stunting_participants > 0 else 0
        
        # Stunting age distribution for household
        stunting_age_dist = {}
        if len(children_df) > 0:
            age_bins = pd.cut(children_df['usia_bulan'], bins=[0, 6, 12, 24, 36, 60], labels=['0-6m', '6-12m', '1-2y', '2-3y', '3-5y'])
            age_distribution = children_df.groupby(age_bins)['child_id'].nunique()
            stunting_age_dist = {str(k): int(v) for k, v in age_distribution.items() if not pd.isna(k)}
        
        # Stunting trends for household
        stunting_trends = []
        if not children_df.empty:
            daily_haz = children_df.groupby('date')['HAZ'].mean()
            if len(daily_haz) > 0:
                stunting_trends.append({
                    "dates": [d.strftime('%Y-%m-%d') for d in daily_haz.index],
                    "values": [float(v) for v in daily_haz.values],
                    "metric_name": "household_avg_haz"
                })
        
        stunting_metrics = StuntingMetrics(
            total_children=int(total_children),
            children_on_program=int(stunting_participants),
            participation_rate=float(round(stunting_participation_rate, 3)),
            avg_haz_improvement=float(round(haz_improvement, 3)),
            program_cost=float(int(stunting_cost)),
            cost_per_participant=float(int(stunting_cost_per_participant))
        )
        
        # ========== COMBINED METRICS FOR HOUSEHOLD ==========
        total_members = total_adults + total_children
        program_participants = htn_participants + stunting_participants
        overall_participation_rate = program_participants / total_members if total_members > 0 else 0
        total_cost = program_log['biaya_riil'].sum()
        
        # Household info
        household_info_dict = {
            "income": float(household_info['pendapatan_rt']) if not pd.isna(household_info['pendapatan_rt']) else 0,
            "members": int(household_info['jumlah_anggota']) if not pd.isna(household_info['jumlah_anggota']) else 0,
            "house_ownership": int(household_info['kepemilikan_rumah']) if not pd.isna(household_info['kepemilikan_rumah']) else 0,
            "electricity_access": int(household_info['akses_listrik']) if not pd.isna(household_info['akses_listrik']) else 0,
            "internet_access": int(household_info['akses_internet']) if not pd.isna(household_info['akses_internet']) else 0
        }
        
        program_costs_breakdown = program_log.groupby('program')['biaya_riil'].sum().to_dict()
        program_distribution = {}
        if len(program_log) > 0:
            program_distribution = program_log['program'].value_counts().to_dict()
            program_distribution = {str(k): int(v) for k, v in program_distribution.items()}
        
        combined_metrics = {
            "total_participants": int(total_members),
            "total_program_participants": int(program_participants),
            "overall_participation_rate": float(round(overall_participation_rate, 3)),
            "total_program_cost": float(int(total_cost)),
            "household_info": household_info_dict,
            "program_distribution": program_distribution,
            "member_breakdown": {
                "adults": int(total_adults),
                "children": int(total_children),
                "adults_in_htn_program": int(htn_participants),
                "children_in_stunting_program": int(stunting_participants)
            },
            "program_costs_breakdown": {str(k): float(v) for k, v in program_costs_breakdown.items()}
        }
        
        # Household-specific alerts
        alerts = []
        if total_members == 0:
            alerts.append("⚠️ No household members found in health programs")
        elif overall_participation_rate == 0:
            alerts.append("🔴 No household members participating in health programs")
        elif overall_participation_rate < 0.5:
            alerts.append("⚠️ Low household program participation")
        
        household_income = household_info_dict["income"]
        if household_income < 2000000:
            alerts.append("💰 Low-income household - may need additional support")
        
        if total_cost > household_income * 0.1:
            alerts.append("💸 Program costs exceed 10% of household income")

        # Risk factors and population summary for household
        # Note: Risk factors are provided through dedicated endpoints, 
        # so we provide empty lists here to satisfy the schema
        hypertension_risk_data = []
        stunting_risk_data = []
        
        # Population risk summary for household
        population_risk_summary = {
            "total_population": int(total_members),
            "high_risk_population": int(adults_df[adults_df['sistol'] > 140]['person_id'].nunique() + 
                                      children_df[children_df['HAZ'] < -2]['child_id'].nunique()),
            "program_coverage": float(round(overall_participation_rate, 3)),
            "risk_factors_identified": 0,  # Placeholder since risk factors use dedicated endpoints
            "geographic_scope": f"Household {household_id}",
            "households_covered": 1
        }
            
        return SeparatedDashboardResponse(
            hypertension_section={
                "metrics": hypertension_metrics.dict(),
                "age_distribution": htn_age_dist,
                "trends": htn_trends,
                "cost_analysis": {
                    "total_cost": float(int(htn_cost)),
                    "cost_per_participant": float(int(htn_cost_per_participant)),
                    "cost_effectiveness": float(htn_cost_per_participant / abs(bp_improvement)) if bp_improvement != 0 else 0
                }
            },
            stunting_section={
                "metrics": stunting_metrics.dict(),
                "age_distribution": stunting_age_dist,
                "trends": stunting_trends,
                "cost_analysis": {
                    "total_cost": float(int(stunting_cost)),
                    "cost_per_participant": float(int(stunting_cost_per_participant)),
                    "cost_effectiveness": float(stunting_cost_per_participant / abs(haz_improvement)) if haz_improvement != 0 else 0
                }
            },
            combined_metrics=combined_metrics,
            hypertension_risk_factors=hypertension_risk_data,
            stunting_risk_factors=stunting_risk_data,
            population_risk_summary=population_risk_summary,
            alerts=alerts,
            time_info={
                "period_months": period_months,
                "start_date": start_date,
                "end_date": end_date,
                "current_date": end_date,  # Use data end date instead of system date
                "period_label": f"{period_months} Month{'s' if period_months > 1 else ''}",
                "household_id": household_id
            }
        )
        
    except Exception as e:
        print(f"Error in household dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam menghasilkan dasbor rumah tangga: {str(e)}")

# =============================================================================
# ADDITIONAL ANALYTICS ENDPOINTS
# =============================================================================

@app.get("/analytics/summary")
async def get_analytics_summary():
    """Get comprehensive analytics summary"""
    try:
        adults_df = data_cache['adults'].copy()
        children_df = data_cache['children'].copy()
        program_log = data_cache['program_log'].copy()
        households_df = data_cache['households'].copy()
        
        # Overall statistics
        total_adults = adults_df['person_id'].nunique()
        total_children = children_df['child_id'].nunique()
        total_households = households_df['household_id'].nunique()
        
        # Program coverage
        adults_in_treatment = adults_df[adults_df['on_treatment'] == 1]['person_id'].nunique()
        children_in_program = children_df[children_df['on_program'] == 1]['child_id'].nunique()
        
        # Geographic distribution
        dusun_distribution = {}
        try:
            income_quartiles = pd.qcut(households_df['pendapatan_rt'], q=4, labels=['Dusun_A', 'Dusun_B', 'Dusun_C', 'Dusun_D'], duplicates='drop')
            households_df['dusun'] = income_quartiles
            dusun_distribution = households_df['dusun'].value_counts().to_dict()
            dusun_distribution = {str(k): int(v) for k, v in dusun_distribution.items()}
        except:
            dusun_distribution = {"Dusun_A": 25, "Dusun_B": 25, "Dusun_C": 25, "Dusun_D": 25}
        
        # Cost analysis
        total_program_cost = program_log['biaya_riil'].sum()
        avg_cost_per_household = total_program_cost / total_households if total_households > 0 else 0
        
        # Health outcomes
        bp_changes = adults_df.groupby('person_id')['sistol'].agg(['first', 'last'])
        bp_changes['improvement'] = bp_changes['first'] - bp_changes['last']
        avg_bp_improvement = bp_changes['improvement'].mean()
        
        haz_improvement = children_df['haz_change_this_month'].mean()
        
        return {
            "population_overview": {
                "total_adults": int(total_adults),
                "total_children": int(total_children),
                "total_households": int(total_households),
                "adults_in_treatment": int(adults_in_treatment),
                "children_in_program": int(children_in_program)
            },
            "geographic_distribution": dusun_distribution,
            "financial_overview": {
                "total_program_cost": float(total_program_cost),
                "avg_cost_per_household": float(avg_cost_per_household),
                "cost_effectiveness_ratio": float(total_program_cost / (adults_in_treatment + children_in_program)) if (adults_in_treatment + children_in_program) > 0 else 0
            },
            "health_outcomes": {
                "avg_bp_improvement": float(avg_bp_improvement) if not pd.isna(avg_bp_improvement) else 0,
                "avg_haz_improvement": float(haz_improvement) if not pd.isna(haz_improvement) else 0,
                "treatment_success_rate": float((adults_in_treatment / total_adults) * 100) if total_adults > 0 else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam menghasilkan ringkasan analitik: {str(e)}")

@app.get("/analytics/trends")
async def get_detailed_trends():
    """Get detailed trend analysis"""
    try:
        adults_df = data_cache['adults'].copy()
        children_df = data_cache['children'].copy()
        program_log = data_cache['program_log'].copy()
        
        trends = {
            "monthly_participation": {},
            "monthly_costs": {},
            "health_outcomes": {},
            "program_effectiveness": {}
        }
        
        # Monthly participation trends
        monthly_adult_participation = adults_df.groupby(adults_df['date'].dt.to_period('M'))['on_treatment'].mean()
        monthly_child_participation = children_df.groupby(children_df['date'].dt.to_period('M'))['on_program'].mean()
        
        trends["monthly_participation"] = {
            "adults": {
                "dates": [str(d) for d in monthly_adult_participation.index],
                "values": [float(v) for v in monthly_adult_participation.values]
            },
            "children": {
                "dates": [str(d) for d in monthly_child_participation.index],
                "values": [float(v) for v in monthly_child_participation.values]
            }
        }
        
        # Monthly costs
        monthly_costs = program_log.groupby(program_log['tanggal'].dt.to_period('M'))['biaya_riil'].sum()
        trends["monthly_costs"] = {
            "dates": [str(d) for d in monthly_costs.index],
            "values": [float(v) for v in monthly_costs.values]
        }
        
        # Health outcomes trends
        monthly_bp = adults_df.groupby(adults_df['date'].dt.to_period('M'))['sistol'].mean()
        monthly_haz = children_df.groupby(children_df['date'].dt.to_period('M'))['HAZ'].mean()
        
        trends["health_outcomes"] = {
            "blood_pressure": {
                "dates": [str(d) for d in monthly_bp.index],
                "values": [float(v) for v in monthly_bp.values]
            },
            "haz_scores": {
                "dates": [str(d) for d in monthly_haz.index],
                "values": [float(v) for v in monthly_haz.values]
            }
        }
        
        return trends
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam menghasilkan tren detail: {str(e)}")

# =============================================================================
# RISK FACTOR ANALYSIS ENDPOINTS
# =============================================================================

@app.get("/risk-factors/hypertension")
async def get_hypertension_risk_factors(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    time_period: Optional[str] = Query("1", description="Time period in months (1, 3, or 12)")
):
    """
    Get comprehensive risk factor analysis for hypertension with visualization data
    """
    try:
        print("Starting hypertension risk factor analysis...")
        adults_df = data_cache['adults'].copy()
        households_df = data_cache['households'].copy()
        print(f"Data telah dimuat: dewasa {adults_df.shape}, rumah tangga {households_df.shape}")
        
        # Parse time period and apply filters
        period_months = int(time_period) if time_period in ["1", "3", "12"] else 1
        print(f"Period months: {period_months}")
        
        if not end_date:
            data_end_date = adults_df['date'].max()
            end_date = data_end_date.strftime('%Y-%m-%d')
            print(f"Auto-set end_date: {end_date}")
            
        if not start_date:
            end_dt = pd.to_datetime(end_date)
            start_dt = end_dt - timedelta(days=period_months * 30)
            start_date = start_dt.strftime('%Y-%m-%d')
            print(f"Auto-set start_date: {start_date}")
        
        # Apply date filters
        print("Applying date filters...")
        start_dt = pd.to_datetime(start_date)
        end_dt = pd.to_datetime(end_date)
        
        print("Filtering adults data...")
        adults_df_filtered = adults_df[(adults_df['date'] >= start_dt) & (adults_df['date'] <= end_dt)]
        print(f"Filtered adults data: {adults_df_filtered.shape}")
        
        # Perform risk factor analysis
        print("Starting risk factor analysis...")
        risk_factors = analyze_hypertension_risk_factors(adults_df_filtered, households_df)
        print(f"Risk factors analysis completed: {len(risk_factors)} factors")
        
        population_summary = generate_population_risk_summary(risk_factors, 'hypertension')
        print("Population summary generated")
        
        # Calculate additional population metrics
        print("Calculating population metrics...")
        total_population = adults_df_filtered['person_id'].nunique()
        print(f"Total population: {total_population}")
        
        # Use safe boolean operations for hypertension definition
        systolic_condition = adults_df_filtered['sistol'].fillna(0) >= 140
        diastolic_condition = adults_df_filtered['diastol'].fillna(0) >= 90
        hypertensive_population = adults_df_filtered[systolic_condition | diastolic_condition]['person_id'].nunique()
        print(f"Hypertensive population: {hypertensive_population}")
        
        prevalence_rate = (hypertensive_population / total_population * 100) if total_population > 0 else 0
        print(f"Prevalence rate: {prevalence_rate}")
        
        return {
            "health_outcome": "hypertension",
            "analysis_period": {
                "start_date": start_date,
                "end_date": end_date,
                "period_months": period_months
            },
            "population_metrics": {
                "total_population": total_population,
                "affected_population": hypertensive_population,
                "prevalence_rate": round(prevalence_rate, 1),
                "population_at_risk": total_population  # FIX: Use total_population instead of population_summary
            },
            "risk_factors": safe_serialize_dict(risk_factors),
            "population_summary": safe_serialize_dict(population_summary),
            "clinical_insights": {
                "primary_modifiable_factors": [rf['factor'] for rf in risk_factors if rf['risk_level'] == 'high' and 'Age' not in rf['factor']][:3],
                "intervention_priorities": [
                    "Target high-risk age groups (50+ years) with intensive monitoring",
                    "Address socioeconomic disparities through community health programs",
                    "Improve medication adherence through education and support systems",
                    "Focus on lifestyle modification programs for smoking and diet"
                ],
                "expected_impact": f"Addressing top 3 risk factors could potentially reduce prevalence by {round(population_summary['composite_risk_score'] * 30, 1)}%"
            }
        }
        
    except Exception as e:
        print(f"Error in endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam menganalisis faktor risiko hipertensi: {str(e)}")

@app.get("/risk-factors/stunting")
async def get_stunting_risk_factors(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    time_period: Optional[str] = Query("1", description="Time period in months (1, 3, or 12)")
):
    """
    Get comprehensive risk factor analysis for child stunting with visualization data
    
    Returns detailed analysis of factors affecting child growth including:
    - Critical age periods (0-24 months) and developmental windows
    - Household economic status and poverty correlations
    - Program participation effects on HAZ scores
    - Infrastructure factors (sanitation, utilities)
    - Environmental and maternal factors
    """
    try:
        children_df = data_cache['children'].copy()
        households_df = data_cache['households'].copy()
        
        # Parse time period and apply filters
        period_months = int(time_period) if time_period in ["1", "3", "12"] else 1
        
        if not end_date:
            data_end_date = children_df['date'].max()
            end_date = data_end_date.strftime('%Y-%m-%d')
            
        if not start_date:
            end_dt = pd.to_datetime(end_date)
            start_dt = end_dt - timedelta(days=period_months * 30)
            start_date = start_dt.strftime('%Y-%m-%d')
        
        # Apply date filters
        start_dt = pd.to_datetime(start_date)
        end_dt = pd.to_datetime(end_date)
        children_df = children_df[(children_df['date'] >= start_dt) & (children_df['date'] <= end_dt)]
        
        # Perform risk factor analysis
        risk_factors = analyze_stunting_risk_factors(children_df, households_df)
        population_summary = generate_population_risk_summary(risk_factors, 'stunting')
        
        # Calculate additional population metrics
        total_population = children_df['child_id'].nunique()
        stunted_population = children_df[children_df['HAZ'] < -2]['child_id'].nunique()
        prevalence_rate = (stunted_population / total_population * 100) if total_population > 0 else 0
        
        return {
            "health_outcome": "stunting",
            "analysis_period": {
                "start_date": start_date,
                "end_date": end_date,
                "period_months": period_months
            },
            "population_metrics": {
                "total_population": total_population,
                "affected_population": stunted_population,
                "prevalence_rate": round(prevalence_rate, 1),
                "population_at_risk": total_population  # FIX: Use total_population instead of population_summary
            },
            "risk_factors": safe_serialize_dict(risk_factors),
            "population_summary": safe_serialize_dict(population_summary),
            "clinical_insights": {
                "critical_intervention_window": "First 1000 days (pregnancy to 24 months)",
                "primary_modifiable_factors": [rf['factor'] for rf in risk_factors if rf['risk_level'] == 'high' and 'Age' not in rf['factor']][:3],
                "intervention_priorities": [
                    "Focus on the critical 1000-day window with intensive nutrition support",
                    "Implement maternal education programs on child nutrition and care",
                    "Address household food security through economic interventions",
                    "Improve sanitation and clean water access in high-risk areas"
                ],
                "expected_impact": f"Addressing top risk factors could potentially reduce stunting by {round(population_summary['composite_risk_score'] * 25, 1)}%"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam menganalisis faktor risiko stunting: {str(e)}")

@app.get("/risk-factors/comparative")
async def get_comparative_risk_analysis(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    time_period: Optional[str] = Query("1", description="Time period in months (1, 3, or 12)")
):
    """
    Compare risk factors between hypertension and stunting for integrated intervention planning
    
    Provides cross-program insights and identifies shared risk factors for
    more efficient resource allocation and intervention strategies
    """
    try:
        adults_df = data_cache['adults'].copy()
        children_df = data_cache['children'].copy()
        households_df = data_cache['households'].copy()
        
        # Parse time period and apply filters
        period_months = int(time_period) if time_period in ["1", "3", "12"] else 1
        
        if not end_date:
            adult_end = adults_df['date'].max()
            child_end = children_df['date'].max()
            data_end_date = max(adult_end, child_end)
            end_date = data_end_date.strftime('%Y-%m-%d')
            
        if not start_date:
            end_dt = pd.to_datetime(end_date)
            start_dt = end_dt - timedelta(days=period_months * 30)
            start_date = start_dt.strftime('%Y-%m-%d')
        
        # Apply date filters
        start_dt = pd.to_datetime(start_date)
        end_dt = pd.to_datetime(end_date)
        adults_df = adults_df[(adults_df['date'] >= start_dt) & (adults_df['date'] <= end_dt)]
        children_df = children_df[(children_df['date'] >= start_dt) & (children_df['date'] <= end_dt)]
        
        # Get risk factors for both outcomes
        htn_risk_factors = analyze_hypertension_risk_factors(adults_df, households_df)
        stunting_risk_factors = analyze_stunting_risk_factors(children_df, households_df)
        
        htn_summary = generate_population_risk_summary(htn_risk_factors, 'hypertension')
        stunting_summary = generate_population_risk_summary(stunting_risk_factors, 'stunting')
        
        # Identify shared risk factors
        htn_factor_names = {rf['factor'] for rf in htn_risk_factors}
        stunting_factor_names = {rf['factor'] for rf in stunting_risk_factors}
        
        shared_factors = []
        for htn_rf in htn_risk_factors:
            for stunting_rf in stunting_risk_factors:
                # Check for conceptually similar factors
                if any(keyword in htn_rf['factor'].lower() and keyword in stunting_rf['factor'].lower() 
                       for keyword in ['income', 'economic', 'house', 'electric', 'internet', 'infrastructure']):
                    shared_factors.append({
                        'factor_category': 'Socioeconomic/Infrastructure',
                        'hypertension_factor': htn_rf['factor'],
                        'stunting_factor': stunting_rf['factor'],
                        'hypertension_correlation': htn_rf['correlation'],
                        'stunting_correlation': stunting_rf['correlation'],
                        'combined_population_affected': htn_rf['total_affected'] + stunting_rf['total_affected'],
                        'intervention_potential': 'high' if (htn_rf['risk_level'] == 'high' or stunting_rf['risk_level'] == 'high') else 'moderate'
                    })
        
        # Remove duplicates
        shared_factors = [dict(t) for t in {tuple(d.items()) for d in shared_factors}]
        
        return {
            "analysis_period": {
                "start_date": start_date,
                "end_date": end_date,
                "period_months": period_months
            },
            "comparison_summary": {
                "hypertension_risk_factors": len(htn_risk_factors),
                "stunting_risk_factors": len(stunting_risk_factors),
                "shared_risk_categories": len(shared_factors),
                "total_population_at_risk": htn_summary['population_at_risk'] + stunting_summary['population_at_risk']
            },
            "hypertension_analysis": {
                "risk_factors": htn_risk_factors,
                "summary": htn_summary
            },
            "stunting_analysis": {
                "risk_factors": stunting_risk_factors,
                "summary": stunting_summary
            },
            "shared_risk_factors": shared_factors,
            "integrated_intervention_strategy": {
                "priority_areas": [
                    "Household socioeconomic support programs",
                    "Community infrastructure improvements (water, sanitation, electricity)",
                    "Integrated health education for families",
                    "Economic empowerment programs targeting women and families"
                ],
                "resource_optimization": "Focus interventions on households with both hypertensive adults and stunted children",
                "expected_synergies": "Addressing shared socioeconomic factors can improve both hypertension control and child nutrition outcomes",
                "cost_effectiveness": f"Integrated approach could be {round((len(shared_factors) / max(len(htn_risk_factors), len(stunting_risk_factors))) * 100, 1)}% more cost-effective"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam melakukan analisis risiko komparatif: {str(e)}")

# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@app.get("/data/households")
async def get_households():
    """Get list of all households"""
    try:
        households = data_cache['households'][['household_id', 'pendapatan_rt', 'jumlah_anggota']].to_dict('records')
        # Clean up NaN values
        for household in households:
            for key, value in household.items():
                if pd.isna(value):
                    household[key] = None
                elif hasattr(value, 'item'):  # numpy scalars
                    household[key] = value.item()
        return {"households": households}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam mengambil data rumah tangga: {str(e)}")

@app.get("/data/dusuns")
async def get_dusuns():
    """Get list of all dusuns (simulated)"""
    try:
        return {"dusuns": ["Dusun_A", "Dusun_B", "Dusun_C", "Dusun_D"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam mengambil data dusun: {str(e)}")

@app.get("/data/programs")
async def get_programs():
    """Get list of all available programs"""
    try:
        programs = data_cache['costs_catalog']['program'].unique().tolist()
        return {"programs": programs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kesalahan dalam mengambil data program: {str(e)}")

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "data_loaded": bool(data_cache),
        "datasets": list(data_cache.keys()) if data_cache else [],
        "database_connected": True,
        "api_version": "3.0.0"
    }

@app.get("/data/statistics", tags=["Data Statistics"])
async def get_data_statistics(
    use_database: bool = Query(False, description="Use database instead of CSV files"),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Get comprehensive data statistics"""
    try:
        if use_database:
            adults_count = db.query(AdultRecord).count()
            children_count = db.query(ChildRecord).count()
            households_count = db.query(HouseholdRecord).count()
            programs_count = db.query(ProgramRecord).count()
            
            # Get date ranges
            adults_dates = db.query(AdultRecord.date).all()
            children_dates = db.query(ChildRecord.date).all()
            program_dates = db.query(ProgramRecord.tanggal).all()
            
            all_dates = [d[0] for d in adults_dates + children_dates + program_dates if d[0]]
            min_date = min(all_dates) if all_dates else None
            max_date = max(all_dates) if all_dates else None
            
        else:
            if not data_cache:
                load_data()
            
            adults_count = len(data_cache.get('adults', []))
            children_count = len(data_cache.get('children', []))
            households_count = len(data_cache.get('households', []))
            programs_count = len(data_cache.get('program_log', []))
            
            # Get date ranges from CSV data
            all_dates = []
            if 'adults' in data_cache and not data_cache['adults'].empty:
                all_dates.extend(data_cache['adults']['date'].tolist())
            if 'children' in data_cache and not data_cache['children'].empty:
                all_dates.extend(data_cache['children']['date'].tolist())
            if 'program_log' in data_cache and not data_cache['program_log'].empty:
                all_dates.extend(data_cache['program_log']['tanggal'].tolist())
            
            min_date = min(all_dates) if all_dates else None
            max_date = max(all_dates) if all_dates else None
        
        return {
            "source": "database" if use_database else "csv_files",
            "record_counts": {
                "adults": adults_count,
                "children": children_count,
                "households": households_count,
                "programs": programs_count,
                "total_individuals": adults_count + children_count
            },
            "date_range": {
                "earliest_record": min_date.isoformat() if min_date else None,
                "latest_record": max_date.isoformat() if max_date else None,
                "data_span_days": (max_date - min_date).days if min_date and max_date else None
            },
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting statistics: {str(e)}")

@app.get("/data/export", tags=["Data Export"])
async def export_data(
    format: str = Query("json", description="Export format: json, csv"),
    table: str = Query("all", description="Table to export: adults, children, households, programs, all"),
    use_database: bool = Query(True, description="Use database instead of CSV files"),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """Export data in specified format"""
    try:
        export_data = {}
        
        if use_database:
            if table in ["adults", "all"]:
                adults = db.query(AdultRecord).all()
                export_data["adults"] = [
                    {
                        "id": a.id,
                        "person_id": a.person_id,
                        "household_id": a.household_id,
                        "date": a.date.isoformat(),
                        "month": a.month,
                        "age": a.age,
                        "sistol": a.sistol,
                        "diastol": a.diastol,
                        "on_treatment": a.on_treatment,
                        "diabetes_koin": a.diabetes_koin,
                        "perokok": a.perokok,
                        "adherence_current": a.adherence_current,
                        "created_at": a.created_at.isoformat(),
                        "updated_at": a.updated_at.isoformat()
                    } for a in adults
                ]
            
            if table in ["children", "all"]:
                children = db.query(ChildRecord).all()
                export_data["children"] = [
                    {
                        "id": c.id,
                        "child_id": c.child_id,
                        "household_id": c.household_id,
                        "date": c.date.isoformat(),
                        "month": c.month,
                        "usia_bulan": c.usia_bulan,
                        "HAZ": c.HAZ,
                        "on_program": c.on_program,
                        "anemia_hb_gdl": c.anemia_hb_gdl,
                        "air_bersih": c.air_bersih,
                        "jamban_sehat": c.jamban_sehat,
                        "haz_change_this_month": c.haz_change_this_month,
                        "created_at": c.created_at.isoformat(),
                        "updated_at": c.updated_at.isoformat()
                    } for c in children
                ]
            
            if table in ["households", "all"]:
                households = db.query(HouseholdRecord).all()
                export_data["households"] = [
                    {
                        "id": h.id,
                        "household_id": h.household_id,
                        "pendapatan_rt": h.pendapatan_rt,
                        "kepemilikan_rumah": h.kepemilikan_rumah,
                        "akses_listrik": h.akses_listrik,
                        "akses_internet": h.akses_internet,
                        "created_at": h.created_at.isoformat(),
                        "updated_at": h.updated_at.isoformat()
                    } for h in households
                ]
            
            if table in ["programs", "all"]:
                programs = db.query(ProgramRecord).all()
                export_data["programs"] = [
                    {
                        "id": p.id,
                        "program": p.program,
                        "target_id": p.target_id,
                        "household_id": p.household_id,
                        "tanggal": p.tanggal.isoformat(),
                        "biaya_riil": p.biaya_riil,
                        "status": p.status,
                        "description": p.description,
                        "created_at": p.created_at.isoformat(),
                        "updated_at": p.updated_at.isoformat()
                    } for p in programs
                ]
        else:
            # Export from CSV cache
            if not data_cache:
                load_data()
            
            if table in ["adults", "all"] and 'adults' in data_cache:
                export_data["adults"] = data_cache['adults'].to_dict('records')
            
            if table in ["children", "all"] and 'children' in data_cache:
                export_data["children"] = data_cache['children'].to_dict('records')
            
            if table in ["households", "all"] and 'households' in data_cache:
                export_data["households"] = data_cache['households'].to_dict('records')
            
            if table in ["programs", "all"] and 'program_log' in data_cache:
                export_data["programs"] = data_cache['program_log'].to_dict('records')
        
        # Return based on format
        if format.lower() == "json":
            return {
                "export_info": {
                    "timestamp": datetime.now().isoformat(),
                    "source": "database" if use_database else "csv_files",
                    "table": table,
                    "format": format,
                    "record_count": sum(len(v) for v in export_data.values()) if isinstance(list(export_data.values())[0], list) else len(list(export_data.values())[0]) if export_data else 0
                },
                "data": export_data
            }
        else:
            raise HTTPException(status_code=400, detail="Only JSON format is currently supported")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

# =============================================================================
# AUTHENTICATION TEST ENDPOINTS
# =============================================================================

@app.get("/auth/test", tags=["Authentication"])
async def test_authentication(api_key: str = Depends(verify_api_key)):
    """Test API key authentication"""
    return {
        "message": "Authentication successful",
        "api_key_valid": True,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/auth/info", tags=["Authentication"])
async def get_auth_info():
    """Get authentication information (public endpoint)"""
    return {
        "authentication_required": True,
        "authentication_type": "Bearer Token",
        "header_format": "Authorization: Bearer <your_api_key>",
        "protected_endpoints": [
            "All CRUD operations (/adults/, /children/, /households/, /programs/)",
            "Bulk operations (/*/bulk/)",
            "Data migration (/data/migrate-csv/)",
            "Data statistics (/data/statistics)",
            "Data export (/data/export)",
            "ML predictions (/predictions/*)",
            "Authentication test (/auth/test)"
        ],
        "public_endpoints": [
            "Health check (/health)",
            "Authentication info (/auth/info)",
            "Dashboard endpoints (/dashboard/*) - read-only",
            "API documentation (/docs, /redoc)"
        ]
    }

# =============================================================================
# STARTUP EVENT
# =============================================================================

# =============================================================================
# ML PREDICTION ENDPOINTS
# =============================================================================

@app.get("/predictions/health-outcomes/{person_id}")
async def get_health_outcome_predictions(
    person_id: str,
    months_ahead: int = Query(6, description="Months ahead to predict (1-24)"),
    intervention_scenario: str = Query("current", description="Intervention scenario: current, enhanced, minimal")
):
    """
    Predict future health outcomes for a specific individual
    
    Returns blood pressure progression for adults or HAZ progression for children
    """
    try:
        print(f"Starting health outcome prediction for {person_id}...")
        
        # Determine if this is an adult or child
        if person_id.startswith('P'):
            # Adult - get from adults longitudinal data
            adults_df = data_cache.get('adults', pd.DataFrame())
            if adults_df.empty:
                raise HTTPException(status_code=503, detail="Adults longitudinal data not available")
            
            person_data = adults_df[adults_df['person_id'] == person_id]
            if person_data.empty:
                raise HTTPException(status_code=404, detail=f"Dewasa {person_id} tidak ditemukan")
            
            prediction = predict_health_outcomes(person_data, 'adult', months_ahead)
            
        elif person_id.startswith('C'):
            # Child - get from children longitudinal data  
            children_df = data_cache.get('children', pd.DataFrame())
            if children_df.empty:
                raise HTTPException(status_code=503, detail="Children longitudinal data not available")
            
            person_data = children_df[children_df['child_id'] == person_id]
            if person_data.empty:
                raise HTTPException(status_code=404, detail=f"Anak {person_id} tidak ditemukan")
            
            prediction = predict_health_outcomes(person_data, 'child', months_ahead)
            
        else:
            raise HTTPException(status_code=400, detail="Invalid person ID format. Use P### for adults or C### for children")
        
        # Add intervention scenario analysis
        prediction['intervention_scenario'] = intervention_scenario
        prediction['scenario_impact'] = _analyze_intervention_scenarios(person_data, prediction, intervention_scenario)
        
        print(f"Health outcome prediction completed for {person_id}")
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in health outcome prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating health prediction: {str(e)}")

@app.get("/predictions/population-risk")
async def get_population_risk_predictions(
    population_type: str = Query("adults", description="Population type: adults or children"),
    risk_threshold: float = Query(0.7, description="Risk threshold for high-risk classification (0-1)"),
    time_period: int = Query(3, description="Time period for analysis in months")
):
    """
    Get ML-enhanced population risk stratification and early warning alerts
    """
    try:
        print(f"Starting population risk analysis for {population_type}...")
        
        if population_type == "adults":
            df = data_cache.get('adults', pd.DataFrame())
            if df.empty:
                raise HTTPException(status_code=503, detail="Adults data not available")
            
            # Get latest data per person for risk calculation
            latest_adult_data = df.groupby('person_id').last().reset_index()
            
            risk_analysis = calculate_population_risk_scores(latest_adult_data, 'adults')
            
            # Identify high-risk individuals
            high_risk_individuals = _identify_high_risk_adults(latest_adult_data, risk_threshold)
            
        else:  # children
            df = data_cache.get('children', pd.DataFrame())
            if df.empty:
                raise HTTPException(status_code=503, detail="Children data not available")
            
            latest_child_data = df.groupby('child_id').last().reset_index()
            
            risk_analysis = calculate_population_risk_scores(latest_child_data, 'children')
            
            high_risk_individuals = _identify_high_risk_children(latest_child_data, risk_threshold)
        
        result = {
            "population_type": population_type,
            "analysis_parameters": {
                "risk_threshold": risk_threshold,
                "time_period_months": time_period,
                "total_population": len(latest_adult_data if population_type == "adults" else latest_child_data)
            },
            "risk_stratification": risk_analysis,
            "high_risk_alerts": high_risk_individuals,
            "intervention_recommendations": _generate_population_interventions(high_risk_individuals, population_type),
            "indikator_peringatan_dini": _detect_early_warning_signs(df, population_type)
        }
        
        print(f"Population risk analysis completed for {population_type}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in population risk analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Error in population risk analysis: {str(e)}")

@app.get("/predictions/treatment-response/{person_id}")
async def predict_treatment_response(
    person_id: str,
    intervention_type: str = Query(..., description="Intervention type (e.g., 'ACEi', 'PMT', 'WASH')"),
    duration_months: int = Query(6, description="Treatment duration in months"),
    adherence_scenario: float = Query(0.8, description="Expected adherence rate (0-1)")
):
    """
    Predict individual treatment response for specific interventions
    """
    try:
        print(f"Starting treatment response prediction for {person_id}...")
        
        # Get person's data
        if person_id.startswith('P'):
            df = data_cache.get('adults', pd.DataFrame())
            person_data = df[df['person_id'] == person_id] if not df.empty else pd.DataFrame()
            person_type = 'adult'
        else:
            df = data_cache.get('children', pd.DataFrame())  
            person_data = df[df['child_id'] == person_id] if not df.empty else pd.DataFrame()
            person_type = 'child'
        
        if person_data.empty:
            raise HTTPException(status_code=404, detail=f"Orang {person_id} tidak ditemukan")
        
        # Get baseline prediction
        baseline_prediction = predict_health_outcomes(person_data, person_type, duration_months)
        
        # Simulate treatment response
        treatment_response = _simulate_treatment_response(
            person_data, intervention_type, duration_months, adherence_scenario, person_type
        )
        
        result = {
            "person_id": person_id,
            "intervention_details": {
                "type": intervention_type,
                "duration_months": duration_months,
                "expected_adherence": adherence_scenario
            },
            "baseline_prediction": baseline_prediction,
            "treatment_response": treatment_response,
            "comparative_analysis": _compare_treatment_scenarios(baseline_prediction, treatment_response),
            "personalized_recommendations": _generate_personalized_recommendations(
                person_data, treatment_response, person_type
            )
        }
        
        print(f"Treatment response prediction completed for {person_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in treatment response prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Error predicting treatment response: {str(e)}")

# =============================================================================
# ML HELPER FUNCTIONS
# =============================================================================

def _analyze_intervention_scenarios(person_data: pd.DataFrame, baseline_prediction: Dict, scenario: str) -> Dict[str, Any]:
    """Analyze different intervention scenarios"""
    
    if scenario == "enhanced":
        # Simulate enhanced intervention
        impact_factor = 1.5
        description = "Enhanced intervention with additional support"
    elif scenario == "minimal":
        # Simulate minimal intervention
        impact_factor = 0.5  
        description = "Minimal intervention - basic care only"
    else:
        # Current scenario
        impact_factor = 1.0
        description = "Current intervention level maintained"
    
    return {
        "scenario": scenario,
        "description": description,
        "impact_factor": impact_factor,
        "estimated_improvement": f"{round(impact_factor * 10, 1)}% over baseline"
    }

def _identify_high_risk_adults(adults_df: pd.DataFrame, threshold: float) -> List[Dict[str, Any]]:
    """Identify high-risk adults based on multiple factors"""
    
    high_risk_adults = []
    
    for _, person in adults_df.iterrows():
        risk_score = 0.0
        risk_factors = []
        
        # BP risk
        if person.get('sistol', 0) >= 160:
            risk_score += 0.4
            risk_factors.append("Severe hypertension")
        elif person.get('sistol', 0) >= 140:
            risk_score += 0.2
            risk_factors.append("Hypertension")
        
        # Age risk
        if person.get('age', person.get('usia', 0)) >= 65:
            risk_score += 0.2
            risk_factors.append("Advanced age")
        
        # Comorbidity risk
        if person.get('diabetes_koin', 0):
            risk_score += 0.3
            risk_factors.append("Diabetes")
        
        if person.get('perokok', 0):
            risk_score += 0.2
            risk_factors.append("Smoking")
        
        # Treatment adherence
        if person.get('on_treatment', 0) and person.get('adherence_current', 1) < 0.8:
            risk_score += 0.2
            risk_factors.append("Poor adherence")
        
        if risk_score >= threshold:
            high_risk_adults.append({
                "person_id": person['person_id'],
                "risk_score": round(risk_score, 3),
                "risk_factors": risk_factors,
                "urgency": "high" if risk_score >= 0.8 else "medium",
                "current_bp": f"{person.get('sistol', 0)}/{person.get('diastol', 0)}",
                "recommendations": _get_urgent_recommendations(risk_factors, 'adult')
            })
    
    return high_risk_adults

def _identify_high_risk_children(children_df: pd.DataFrame, threshold: float) -> List[Dict[str, Any]]:
    """Identify high-risk children based on multiple factors"""
    
    high_risk_children = []
    
    for _, child in children_df.iterrows():
        risk_score = 0.0
        risk_factors = []
        
        # HAZ risk
        if child.get('HAZ', 0) < -3:
            risk_score += 0.5
            risk_factors.append("Severe stunting")
        elif child.get('HAZ', 0) < -2:
            risk_score += 0.3
            risk_factors.append("Moderate stunting")
        
        # Age risk (younger children more vulnerable)
        if child.get('usia_bulan', 24) < 24:
            risk_score += 0.2
            risk_factors.append("Critical age period")
        
        # Anemia risk
        if child.get('anemia_hb_gdl', 12) < 10:
            risk_score += 0.3
            risk_factors.append("Severe anemia")
        elif child.get('anemia_hb_gdl', 12) < 11:
            risk_score += 0.2
            risk_factors.append("Anemia")
        
        # Environmental risks
        if not child.get('air_bersih', 1):
            risk_score += 0.1
            risk_factors.append("No clean water")
        
        if not child.get('jamban_sehat', 1):
            risk_score += 0.1
            risk_factors.append("Poor sanitation")
        
        if risk_score >= threshold:
            high_risk_children.append({
                "child_id": child['child_id'],
                "risk_score": round(risk_score, 3),
                "risk_factors": risk_factors,
                "urgency": "high" if risk_score >= 0.8 else "medium",
                "current_haz": child.get('HAZ', 0),
                "age_months": child.get('usia_bulan', 0),
                "recommendations": _get_urgent_recommendations(risk_factors, 'child')
            })
    
    return high_risk_children

def _simulate_treatment_response(person_data: pd.DataFrame, intervention: str, duration: int, adherence: float, person_type: str) -> Dict[str, Any]:
    """Simulate treatment response based on intervention type"""
    
    print(f"🔧 Simulating treatment: {intervention}, duration: {duration}, adherence: {adherence}")
    
    latest = person_data.iloc[-1]
    
    if person_type == 'adult':
        # BP treatment simulation
        current_sys = latest.get('sistol', 140)
        current_dia = latest.get('diastol', 90)
        
        # Normalize intervention name to lowercase for consistency
        intervention_lower = intervention.lower()
        
        if intervention_lower == 'acei':
            sys_reduction = 12 * adherence * min(1, duration / 6)
            dia_reduction = 8 * adherence * min(1, duration / 6)
            success_base = 0.85
        elif intervention_lower == 'ccb':
            sys_reduction = 10 * adherence * min(1, duration / 6)
            dia_reduction = 6 * adherence * min(1, duration / 6)
            success_base = 0.82
        elif intervention_lower == 'diuretik':
            sys_reduction = 8 * adherence * min(1, duration / 6)
            dia_reduction = 5 * adherence * min(1, duration / 6)
            success_base = 0.80
        elif intervention_lower == 'lifestyle':
            sys_reduction = 6 * adherence * min(1, duration / 6)
            dia_reduction = 4 * adherence * min(1, duration / 6)
            success_base = 0.70
        else:
            # Default medication
            sys_reduction = 6 * adherence * min(1, duration / 6)
            dia_reduction = 4 * adherence * min(1, duration / 6)
            success_base = 0.75
        
        predicted_sys = max(90, current_sys - sys_reduction)
        predicted_dia = max(60, current_dia - dia_reduction)
        
        # Calculate probability based on adherence, intervention type, and patient factors
        probability = min(0.95, success_base * adherence * (1 + 0.1 if current_sys < 160 else 0))
        
        return {
            "hasil_prediksi": {
                "sistolik": round(predicted_sys, 1),
                "diastolik": round(predicted_dia, 1)
            },
            "perbaikan_yang_diharapkan": {
                "penurunan_sistolik": round(sys_reduction, 1),
                "penurunan_diastolik": round(dia_reduction, 1)
            },
            "probabilitas_keberhasilan": round(probability, 2)
        }
    
    else:
        # Child nutrition intervention simulation
        current_haz = latest.get('HAZ', -1)
        age_months = latest.get('usia_bulan', 24)
        
        # Normalize intervention name
        intervention_lower = intervention.lower()
        
        # Age factor - younger children respond better
        age_factor = max(0.3, 1 - age_months / 60)
        
        if intervention_lower == 'pmt':
            haz_improvement = 0.4 * adherence * min(1, duration / 12) * age_factor
            success_base = 0.85
        elif intervention_lower == 'mikronutrien':
            haz_improvement = 0.25 * adherence * min(1, duration / 12) * age_factor
            success_base = 0.80
        elif intervention_lower == 'wash':
            haz_improvement = 0.2 * adherence * min(1, duration / 12) * age_factor
            success_base = 0.75
        elif intervention_lower == 'konseling':
            haz_improvement = 0.15 * adherence * min(1, duration / 12) * age_factor
            success_base = 0.70
        else:
            haz_improvement = 0.1 * adherence * min(1, duration / 12) * age_factor
            success_base = 0.65
        
        predicted_haz = min(3, current_haz + haz_improvement)
        
        # Calculate probability based on intervention type and child factors
        probability = min(0.95, success_base * adherence * age_factor)
        
        return {
            "hasil_prediksi": {
                "haz": round(predicted_haz, 2),
                "risiko_stunting": "rendah" if predicted_haz >= -1 else "sedang" if predicted_haz >= -2 else "tinggi"
            },
            "perbaikan_yang_diharapkan": {
                "peningkatan_haz": round(haz_improvement, 2)
            },
            "probabilitas_keberhasilan": round(probability, 2)
        }

def _generate_population_interventions(high_risk_individuals: List[Dict], population_type: str) -> List[str]:
    """Generate population-level intervention recommendations"""
    
    if not high_risk_individuals:
        return ["Tidak ada individu berisiko tinggi yang teridentifikasi - lanjutkan pemantauan rutin"]
    
    recommendations = []
    
    if population_type == "adults":
        recommendations.extend([
            f"Tindak lanjut mendesak diperlukan untuk {len(high_risk_individuals)} dewasa berisiko tinggi",
            "Tingkatkan manajemen obat dan dukungan kepatuhan",
            "Implementasikan skrining hipertensi berbasis komunitas",
            "Sediakan program modifikasi gaya hidup yang menargetkan kelompok berisiko tinggi"
        ])
    else:
        recommendations.extend([
            f"Intervensi gizi mendesak diperlukan untuk {len(high_risk_individuals)} anak berisiko tinggi",
            "Perkuat program gizi komunitas",
            "Tingkatkan infrastruktur WASH di daerah terdampak", 
            "Perkuat sistem pemantauan pertumbuhan dan deteksi dini"
        ])
    
    return recommendations

def _detect_early_warning_signs(df: pd.DataFrame, population_type: str) -> List[Dict[str, Any]]:
    """Detect early warning indicators in population trends"""
    
    warnings = []
    
    if df.empty:
        return warnings
    
    # Convert date column if it exists
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'])
        
        # Analyze recent trends (last 3 months)
        recent_data = df[df['date'] >= df['date'].max() - timedelta(days=90)]
        
        if population_type == "adults":
            # Check for increasing BP trends
            if 'sistol' in recent_data.columns:
                recent_avg_sys = recent_data['sistol'].mean()
                overall_avg_sys = df['sistol'].mean()
                
                if recent_avg_sys > overall_avg_sys + 5:
                    warnings.append({
                        "type": "increasing_blood_pressure",
                        "severity": "medium",
                        "description": f"Rata-rata tekanan darah sistolik meningkat {recent_avg_sys - overall_avg_sys:.1f} mmHg dalam bulan-bulan terakhir",
                        "recommendation": "Tinjau intervensi tingkat populasi dan kepatuhan obat"
                    })
        
        else:
            # Check for worsening growth trends in children
            if 'HAZ' in recent_data.columns:
                recent_avg_haz = recent_data['HAZ'].mean()
                overall_avg_haz = df['HAZ'].mean()
                
                if recent_avg_haz < overall_avg_haz - 0.2:
                    warnings.append({
                        "type": "declining_growth",
                        "severity": "high",
                        "description": f"Rata-rata HAZ menurun {overall_avg_haz - recent_avg_haz:.2f} dalam bulan-bulan terakhir",
                        "recommendation": "Selidiki penyebab dan perkuat program gizi segera"
                    })
    
    return warnings

def _compare_treatment_scenarios(baseline: Dict, treatment: Dict) -> Dict[str, Any]:
    """Compare baseline vs treatment scenarios"""
    
    comparison = {
        "treatment_benefit": "Significant improvement expected",
        "risk_reduction": "High",
        "cost_effectiveness": "Good"
    }
    
    # Add specific comparisons based on available data
    if 'predicted_bp' in baseline and 'predicted_outcome' in treatment:
        baseline_sys = baseline['predicted_bp']['systolic']
        treatment_sys = treatment['predicted_outcome']['systolic']
        
        improvement = baseline_sys - treatment_sys
        comparison['bp_improvement'] = f"{improvement:.1f} mmHg systolic reduction expected"
    
    return comparison

def _generate_personalized_recommendations(person_data: pd.DataFrame, treatment_response: Dict, person_type: str) -> List[str]:
    """Generate personalized recommendations based on individual characteristics"""
    
    latest = person_data.iloc[-1]
    recommendations = []
    
    if person_type == 'adult':
        recommendations.extend([
            "Pemantauan tekanan darah rutin (mingguan pada awalnya)",
            "Konseling dan dukungan kepatuhan minum obat",
            "Modifikasi gaya hidup (diet, olahraga, berhenti merokok)"
        ])
        
        if latest.get('diabetes_koin', 0):
            recommendations.append("Manajemen diabetes-hipertensi terpadu")
        
        if latest.get('adherence_current', 1) < 0.8:
            recommendations.append("Dukungan kepatuhan yang ditingkatkan - pertimbangkan pengingat obat atau keterlibatan keluarga")
    
    else:
        recommendations.extend([
            "Pemantauan dan penilaian pertumbuhan bulanan",
            "Konseling gizi untuk pengasuh",
            "Pastikan kelengkapan jadwal imunisasi"
        ])
        
        if latest.get('usia_bulan', 24) < 24:
            recommendations.append("Focus on critical 1000-day window - intensive support")
        
        if latest.get('anemia_hb_gdl', 12) < 11:
            recommendations.append("Iron supplementation and deworming")
    
    return recommendations

def _get_urgent_recommendations(risk_factors: List[str], person_type: str) -> List[str]:
    """Get urgent recommendations based on risk factors"""
    
    recommendations = []
    
    if "Severe hypertension" in risk_factors:
        recommendations.append("URGENT: Medical evaluation within 24 hours")
    
    if "Severe stunting" in risk_factors:
        recommendations.append("URGENT: Nutritionist consultation and therapeutic feeding")
    
    if "Poor adherence" in risk_factors:
        recommendations.append("Immediate adherence intervention required")
    
    if "Severe anemia" in risk_factors:
        recommendations.append("URGENT: Iron supplementation and medical evaluation")
    
    return recommendations

@app.on_event("startup")
async def startup_event():
    """Load data on startup"""
    print("🚀 Memulai API Dashboard Kesehatan Digital Twin...")
    success = load_data()
    if not success:
        print("⚠️ Beberapa endpoint mungkin tidak berfungsi - data gagal dimuat")
    else:
        print("✅ API siap melayani data dashboard")

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "dashboard_server_fixed:app",
        host="0.0.0.0",
        port=8091,
        reload=True,
        log_level="info"
    )