#!/usr/bin/env python3
"""
Enhanced data migration script for Digital Twin Health Dashboard
Ensures proper database setup and migrates CSV data to SQLite database
"""

import sys
import os
import sqlite3
from pathlib import Path

def ensure_database_directory():
    """Ensure the database directory exists and has proper permissions"""
    db_url = os.getenv("DATABASE_URL", "sqlite:///app/db/digital_twin.db")
    
    if db_url.startswith("sqlite:///"):
        db_path = db_url[10:]  # Remove "sqlite:///"
        db_dir = os.path.dirname(db_path)
        
        if db_dir:
            print(f"📁 Creating database directory: {db_dir}")
            os.makedirs(db_dir, exist_ok=True)
            
            # Test database write access
            test_db = os.path.join(db_dir, "test.db")
            try:
                conn = sqlite3.connect(test_db)
                conn.execute("CREATE TABLE test (id INTEGER)")
                conn.close()
                os.remove(test_db)
                print(f"✅ Database directory is writable")
            except Exception as e:
                print(f"❌ Database directory not writable: {e}")
                return False
    
    return True

def main():
    try:
        print('🚀 Starting data migration...')
        
        # Ensure database directory exists
        if not ensure_database_directory():
            return 1
        
        # Add the app directory to Python path
        sys.path.append('/app')
        
        # Import required modules
        import pandas as pd
        from dashboard_server_fixed import (
            SessionLocal, Base, engine, 
            AdultRecord, ChildRecord, HouseholdRecord, ProgramRecord,
            load_data, data_cache
        )
        
        # Load CSV data
        print('📊 Loading CSV data...')
        load_data()
        
        if not data_cache:
            print('❌ No data loaded from CSV files')
            return 1
        
        # Create database tables
        print('🗃️ Creating database tables...')
        Base.metadata.create_all(bind=engine)
        
        # Get database session
        db = SessionLocal()
        
        try:
            migration_summary = {
                "households": 0,
                "adults": 0,
                "children": 0,
                "programs": 0
            }
            
            # Migrate households
            if 'households' in data_cache and not data_cache['households'].empty:
                print('🏠 Migrating household data...')
                household_data = data_cache['households']
                
                for _, row in household_data.iterrows():
                    existing = db.query(HouseholdRecord).filter(
                        HouseholdRecord.household_id == str(row.get('household_id', ''))
                    ).first()
                    
                    if not existing:
                        household = HouseholdRecord(
                            household_id=str(row.get('household_id', '')),
                            pendapatan_rt=float(row.get('household_income', 0)) if pd.notna(row.get('household_income')) else 0.0,
                            kepemilikan_rumah=bool(row.get('kepemilikan_rumah', True)),
                            akses_listrik=bool(row.get('akses_listrik', True)),
                            akses_internet=bool(row.get('akses_internet', False))
                        )
                        db.add(household)
                        migration_summary["households"] += 1
            
            # Migrate adults
            if 'adults' in data_cache and not data_cache['adults'].empty:
                print('👨 Migrating adult data...')
                adult_data = data_cache['adults']
                
                for _, row in adult_data.iterrows():
                    existing = db.query(AdultRecord).filter(
                        AdultRecord.person_id == str(row.get('person_id', ''))
                    ).first()
                    
                    if not existing:
                        adult = AdultRecord(
                            person_id=str(row.get('person_id', '')),
                            household_id=str(row.get('household_id', '')),
                            date=pd.to_datetime(row.get('date')) if pd.notna(row.get('date')) else None,
                            month=int(row.get('month', 0)) if pd.notna(row.get('month')) else 0,
                            age=int(row.get('age', 0)) if pd.notna(row.get('age')) else 0,
                            sistol=float(row.get('sistol', 0)) if pd.notna(row.get('sistol')) else 0.0,
                            diastol=float(row.get('diastol', 0)) if pd.notna(row.get('diastol')) else 0.0,
                            on_treatment=bool(row.get('on_treatment', False)),
                            diabetes_koin=bool(row.get('diabetes_koin', False)),
                            perokok=bool(row.get('perokok', False))
                        )
                        db.add(adult)
                        migration_summary["adults"] += 1
            
            # Migrate children
            if 'children' in data_cache and not data_cache['children'].empty:
                print('👶 Migrating children data...')
                child_data = data_cache['children']
                
                for _, row in child_data.iterrows():
                    existing = db.query(ChildRecord).filter(
                        ChildRecord.person_id == str(row.get('person_id', ''))
                    ).first()
                    
                    if not existing:
                        child = ChildRecord(
                            person_id=str(row.get('person_id', '')),
                            household_id=str(row.get('household_id', '')),
                            date=pd.to_datetime(row.get('date')) if pd.notna(row.get('date')) else None,
                            month=int(row.get('month', 0)) if pd.notna(row.get('month')) else 0,
                            age_months=int(row.get('age_months', 0)) if pd.notna(row.get('age_months')) else 0,
                            height_cm=float(row.get('height_cm', 0)) if pd.notna(row.get('height_cm')) else 0.0,
                            weight_kg=float(row.get('weight_kg', 0)) if pd.notna(row.get('weight_kg')) else 0.0,
                            z_score=float(row.get('z_score', 0)) if pd.notna(row.get('z_score')) else 0.0,
                            stunted=bool(row.get('stunted', False)),
                            intervention_status=str(row.get('intervention_status', ''))
                        )
                        db.add(child)
                        migration_summary["children"] += 1
            
            # Migrate programs
            if 'program_log' in data_cache and not data_cache['program_log'].empty:
                print('📋 Migrating program data...')
                program_data = data_cache['program_log']
                
                for _, row in program_data.iterrows():
                    existing = db.query(ProgramRecord).filter(
                        ProgramRecord.person_id == str(row.get('person_id', '')),
                        ProgramRecord.program_type == str(row.get('program_type', ''))
                    ).first()
                    
                    if not existing:
                        program = ProgramRecord(
                            person_id=str(row.get('person_id', '')),
                            household_id=str(row.get('household_id', '')),
                            program_type=str(row.get('program_type', '')),
                            date=pd.to_datetime(row.get('date')) if pd.notna(row.get('date')) else None,
                            month=int(row.get('month', 0)) if pd.notna(row.get('month')) else 0,
                            outcome_before=float(row.get('outcome_before', 0)) if pd.notna(row.get('outcome_before')) else 0.0,
                            outcome_after=float(row.get('outcome_after', 0)) if pd.notna(row.get('outcome_after')) else 0.0,
                            improvement=float(row.get('improvement', 0)) if pd.notna(row.get('improvement')) else 0.0,
                            cost=float(row.get('cost', 0)) if pd.notna(row.get('cost')) else 0.0
                        )
                        db.add(program)
                        migration_summary["programs"] += 1
            
            # Commit the transaction
            db.commit()
            
            print(f'📊 Migration Summary:')
            print(f'   🏠 Households: {migration_summary["households"]}')
            print(f'   👨 Adults: {migration_summary["adults"]}')
            print(f'   👶 Children: {migration_summary["children"]}')
            print(f'   📋 Programs: {migration_summary["programs"]}')
            print(f'   📈 Total: {sum(migration_summary.values())} records')
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        
        print('✅ Data migration completed successfully')
        return 0
        
    except Exception as e:
        print(f'❌ Migration failed: {e}')
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
