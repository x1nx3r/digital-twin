from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any, Union
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import uvicorn
from pydantic import BaseModel
import json

# Initialize FastAPI app
app = FastAPI(
    title="Digital Twin Health Dashboard API",
    description="API for comprehensive health program monitoring and analytics",
    version="1.0.0"
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global data storage
data_cache = {}

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
        
        print("✅ All datasets loaded successfully")
        return True
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        return False

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
        elif pd.isna(value):
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
class HealthMetrics(BaseModel):
    total_participants: int
    program_participants: int
    participation_rate: float
    avg_outcome_improvement: float
    total_program_cost: float
    cost_per_participant: float

class TrendData(BaseModel):
    dates: List[str]
    values: List[float]
    metric_name: str

class DashboardResponse(BaseModel):
    summary_metrics: HealthMetrics
    trends: List[TrendData]
    distribution_data: Dict[str, Any]
    alerts: List[str]

# =============================================================================
# OVERALL DASHBOARD MODULE
# =============================================================================

@app.get("/dashboard/overall", response_model=DashboardResponse)
async def get_overall_dashboard(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    program_type: Optional[str] = Query(None, description="Filter by program type (htn/stunting)")
):
    """
    Get overall system-wide dashboard metrics
    """
    try:
        adults_df = data_cache['adults'].copy()
        children_df = data_cache['children'].copy()
        program_log = data_cache['program_log'].copy()
        
        # Apply date filters
        if start_date:
            start_dt = pd.to_datetime(start_date)
            adults_df = adults_df[adults_df['date'] >= start_dt]
            children_df = children_df[children_df['date'] >= start_dt]
            program_log = program_log[program_log['tanggal'] >= start_dt]
            
        if end_date:
            end_dt = pd.to_datetime(end_date)
            adults_df = adults_df[adults_df['date'] <= end_dt]
            children_df = children_df[children_df['date'] <= end_dt]
            program_log = program_log[program_log['tanggal'] <= end_dt]
        
        # Calculate summary metrics
        if program_type == "htn" or program_type is None:
            htn_total = adults_df['person_id'].nunique()
            htn_participants = adults_df[adults_df['on_treatment'] == 1]['person_id'].nunique()
            htn_participation_rate = htn_participants / htn_total if htn_total > 0 else 0
            
            # Calculate BP improvement
            baseline_bp = adults_df[adults_df['month'] == 0].groupby('person_id')['sistol'].first()
            latest_bp = adults_df.groupby('person_id')['sistol'].last()
            bp_improvement = (baseline_bp - latest_bp).mean()
            if pd.isna(bp_improvement):
                bp_improvement = 0

        if program_type == "stunting" or program_type is None:
            stunting_total = children_df['child_id'].nunique()
            stunting_participants = children_df[children_df['on_program'] == 1]['child_id'].nunique()
            stunting_participation_rate = stunting_participants / stunting_total if stunting_total > 0 else 0
            
            # Calculate HAZ improvement
            haz_improvement = children_df['haz_change_this_month'].mean()
            if pd.isna(haz_improvement):
                haz_improvement = 0
        
        # Combined metrics
        if program_type is None:
            total_participants = htn_total + stunting_total
            program_participants = htn_participants + stunting_participants
            participation_rate = program_participants / total_participants if total_participants > 0 else 0
            avg_improvement = (bp_improvement + haz_improvement) / 2
        elif program_type == "htn":
            total_participants = htn_total
            program_participants = htn_participants
            participation_rate = htn_participation_rate
            avg_improvement = bp_improvement
        else:  # stunting
            total_participants = stunting_total
            program_participants = stunting_participants
            participation_rate = stunting_participation_rate
            avg_improvement = haz_improvement
        
        # Calculate costs
        total_cost = program_log['biaya_riil'].sum()
        cost_per_participant = total_cost / program_participants if program_participants > 0 else 0
        
        summary_metrics = HealthMetrics(
            total_participants=int(total_participants),
            program_participants=int(program_participants),
            participation_rate=float(round(participation_rate, 3)),
            avg_outcome_improvement=float(round(avg_improvement, 2)),
            total_program_cost=float(int(total_cost)),
            cost_per_participant=float(int(cost_per_participant))
        )
        
        # Generate trend data
        trends = []
        
        # Monthly participation trend
        monthly_participation = adults_df.groupby(adults_df['date'].dt.to_period('M'))['on_treatment'].mean()
        if len(monthly_participation) > 0:
            trends.append(TrendData(
                dates=[str(d) for d in monthly_participation.index],
                values=[float(v) for v in monthly_participation.values],
                metric_name="participation_rate"
            ))
        
        # Monthly cost trend
        monthly_costs = program_log.groupby(program_log['tanggal'].dt.to_period('M'))['biaya_riil'].sum()
        if len(monthly_costs) > 0:
            trends.append(TrendData(
                dates=[str(d) for d in monthly_costs.index],
                values=[float(v) for v in monthly_costs.values],
                metric_name="monthly_costs"
            ))
        
        # Distribution data - FIXED to handle pandas Intervals
        if len(adults_df) > 0:
            age_bins = pd.cut(adults_df['age'], bins=5)
            age_distribution = adults_df.groupby(age_bins)['person_id'].nunique()
            
            # Convert age distribution to serializable format
            age_dist_serializable = {}
            for interval, count in age_distribution.items():
                age_range = f"{interval.left:.0f}-{interval.right:.0f}"
                age_dist_serializable[age_range] = int(count)
        else:
            age_dist_serializable = {}
        
        program_distribution = program_log['program'].value_counts().to_dict()
        household_income_stats = data_cache['households']['pendapatan_rt'].describe().to_dict()
        
        distribution_data = {
            "age_distribution": age_dist_serializable,
            "program_distribution": {str(k): int(v) for k, v in program_distribution.items()},
            "household_income_distribution": {str(k): float(v) for k, v in household_income_stats.items()}
        }
        
        # Safely serialize distribution data
        distribution_data = safe_serialize_dict(distribution_data)
        
        # Generate alerts
        alerts = []
        if participation_rate < 0.5:
            alerts.append("⚠️ Low participation rate detected")
        if avg_improvement < 0:
            alerts.append("🔴 Negative health outcomes trend")
        if cost_per_participant > 500000:
            alerts.append("💰 High cost per participant")
            
        return DashboardResponse(
            summary_metrics=summary_metrics,
            trends=trends,
            distribution_data=distribution_data,
            alerts=alerts
        )
        
    except Exception as e:
        print(f"Error in overall dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating overall dashboard: {str(e)}")

# =============================================================================
# PER-DUSUN DASHBOARD MODULE
# =============================================================================

@app.get("/dashboard/dusun/{dusun_id}", response_model=DashboardResponse)
async def get_dusun_dashboard(
    dusun_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """
    Get dashboard metrics for a specific dusun (village area)
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
            raise HTTPException(status_code=404, detail=f"Dusun {dusun_id} not found")
        
        # Filter data for this dusun
        adults_df = data_cache['adults'][data_cache['adults']['household_id'].isin(dusun_households)].copy()
        children_df = data_cache['children'][data_cache['children']['household_id'].isin(dusun_households)].copy()
        program_log = data_cache['program_log'][
            data_cache['program_log']['target_id'].isin(
                adults_df['person_id'].tolist() + children_df['child_id'].tolist() + dusun_households
            )
        ].copy()
        
        # Apply date filters
        if start_date:
            start_dt = pd.to_datetime(start_date)
            adults_df = adults_df[adults_df['date'] >= start_dt]
            children_df = children_df[children_df['date'] >= start_dt]
            program_log = program_log[program_log['tanggal'] >= start_dt]
            
        if end_date:
            end_dt = pd.to_datetime(end_date)
            adults_df = adults_df[adults_df['date'] <= end_dt]
            children_df = children_df[children_df['date'] <= end_dt]
            program_log = program_log[program_log['tanggal'] <= end_dt]
        
        # Calculate dusun-specific metrics
        total_adults = adults_df['person_id'].nunique()
        total_children = children_df['child_id'].nunique()
        total_participants = total_adults + total_children
        
        htn_participants = adults_df[adults_df['on_treatment'] == 1]['person_id'].nunique()
        stunting_participants = children_df[children_df['on_program'] == 1]['child_id'].nunique()
        program_participants = htn_participants + stunting_participants
        
        participation_rate = program_participants / total_participants if total_participants > 0 else 0
        
        # Health outcomes
        baseline_bp = adults_df[adults_df['month'] == 0].groupby('person_id')['sistol'].first()
        latest_bp = adults_df.groupby('person_id')['sistol'].last()
        bp_improvement = (baseline_bp - latest_bp).mean()
        if pd.isna(bp_improvement):
            bp_improvement = 0
        
        haz_improvement = children_df['haz_change_this_month'].mean()
        if pd.isna(haz_improvement):
            haz_improvement = 0
            
        avg_improvement = (bp_improvement + haz_improvement) / 2
        
        # Costs
        total_cost = program_log['biaya_riil'].sum()
        cost_per_participant = total_cost / program_participants if program_participants > 0 else 0
        
        summary_metrics = HealthMetrics(
            total_participants=int(total_participants),
            program_participants=int(program_participants),
            participation_rate=float(round(participation_rate, 3)),
            avg_outcome_improvement=float(round(avg_improvement, 2)),
            total_program_cost=float(int(total_cost)),
            cost_per_participant=float(int(cost_per_participant))
        )
        
        # Dusun-specific trends
        trends = []
        
        # Weekly health outcome trends
        if len(adults_df) > 0:
            weekly_bp = adults_df.groupby(adults_df['date'].dt.to_period('W'))['sistol'].mean()
            if len(weekly_bp) > 0:
                trends.append(TrendData(
                    dates=[str(d) for d in weekly_bp.index],
                    values=[float(v) for v in weekly_bp.values],
                    metric_name="avg_blood_pressure"
                ))
        
        if len(children_df) > 0:
            weekly_haz = children_df.groupby(children_df['date'].dt.to_period('W'))['HAZ'].mean()
            if len(weekly_haz) > 0:
                trends.append(TrendData(
                    dates=[str(d) for d in weekly_haz.index],
                    values=[float(v) for v in weekly_haz.values],
                    metric_name="avg_haz_score"
                ))
        
        # Distribution data
        distribution_data = safe_serialize_dict({
            "household_count": len(dusun_households),
            "age_group_distribution": {
                "adults": int(total_adults),
                "children": int(total_children)
            },
            "program_effectiveness": {
                "htn_participants": int(htn_participants),
                "stunting_participants": int(stunting_participants)
            }
        })
        
        # Dusun-specific alerts
        alerts = []
        if len(dusun_households) < 5:
            alerts.append("📍 Small dusun - limited statistical power")
        if participation_rate < 0.3:
            alerts.append("⚠️ Very low participation in this dusun")
        if total_cost / len(dusun_households) > 200000:
            alerts.append("💰 High cost per household in this dusun")
            
        return DashboardResponse(
            summary_metrics=summary_metrics,
            trends=trends,
            distribution_data=distribution_data,
            alerts=alerts
        )
        
    except Exception as e:
        print(f"Error in dusun dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating dusun dashboard: {str(e)}")

# =============================================================================
# PER-HOUSEHOLD DASHBOARD MODULE
# =============================================================================

@app.get("/dashboard/household/{household_id}", response_model=DashboardResponse)
async def get_household_dashboard(
    household_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """
    Get dashboard metrics for a specific household
    """
    try:
        # Get household info
        household_info = data_cache['households'][data_cache['households']['household_id'] == household_id]
        if household_info.empty:
            raise HTTPException(status_code=404, detail=f"Household {household_id} not found")
        
        household_info = household_info.iloc[0]
        
        # Filter data for this household
        adults_df = data_cache['adults'][data_cache['adults']['household_id'] == household_id].copy()
        children_df = data_cache['children'][data_cache['children']['household_id'] == household_id].copy()
        program_log = data_cache['program_log'][
            data_cache['program_log']['target_id'].isin(
                adults_df['person_id'].tolist() + children_df['child_id'].tolist() + [household_id]
            )
        ].copy()
        
        # Apply date filters
        if start_date:
            start_dt = pd.to_datetime(start_date)
            adults_df = adults_df[adults_df['date'] >= start_dt]
            children_df = children_df[children_df['date'] >= start_dt]
            program_log = program_log[program_log['tanggal'] >= start_dt]
            
        if end_date:
            end_dt = pd.to_datetime(end_date)
            adults_df = adults_df[adults_df['date'] <= end_dt]
            children_df = children_df[children_df['date'] <= end_dt]
            program_log = program_log[program_log['tanggal'] <= end_dt]
        
        # Calculate household-specific metrics
        total_adults = adults_df['person_id'].nunique()
        total_children = children_df['child_id'].nunique()
        total_members = total_adults + total_children
        
        htn_participants = adults_df[adults_df['on_treatment'] == 1]['person_id'].nunique()
        stunting_participants = children_df[children_df['on_program'] == 1]['child_id'].nunique()
        program_participants = htn_participants + stunting_participants
        
        participation_rate = program_participants / total_members if total_members > 0 else 0
        
        # Health outcomes for household members
        if not adults_df.empty:
            baseline_bp = adults_df[adults_df['month'] == 0].groupby('person_id')['sistol'].first()
            latest_bp = adults_df.groupby('person_id')['sistol'].last()
            bp_improvement = (baseline_bp - latest_bp).mean()
            if pd.isna(bp_improvement):
                bp_improvement = 0
        else:
            bp_improvement = 0
            
        if not children_df.empty:
            haz_improvement = children_df['haz_change_this_month'].mean()
            if pd.isna(haz_improvement):
                haz_improvement = 0
        else:
            haz_improvement = 0
            
        avg_improvement = (bp_improvement + haz_improvement) / 2 if (total_adults + total_children) > 0 else 0
        
        # Household costs
        total_cost = program_log['biaya_riil'].sum()
        cost_per_participant = total_cost / program_participants if program_participants > 0 else 0
        
        summary_metrics = HealthMetrics(
            total_participants=int(total_members),
            program_participants=int(program_participants),
            participation_rate=float(round(participation_rate, 3)),
            avg_outcome_improvement=float(round(avg_improvement, 2)),
            total_program_cost=float(int(total_cost)),
            cost_per_participant=float(int(cost_per_participant))
        )
        
        # Household-specific trends
        trends = []
        
        # Daily health trends for household members
        if not adults_df.empty:
            daily_bp = adults_df.groupby('date')['sistol'].mean()
            if len(daily_bp) > 0:
                trends.append(TrendData(
                    dates=[d.strftime('%Y-%m-%d') for d in daily_bp.index],
                    values=[float(v) for v in daily_bp.values],
                    metric_name="household_avg_bp"
                ))
        
        if not children_df.empty:
            daily_haz = children_df.groupby('date')['HAZ'].mean()
            if len(daily_haz) > 0:
                trends.append(TrendData(
                    dates=[d.strftime('%Y-%m-%d') for d in daily_haz.index],
                    values=[float(v) for v in daily_haz.values],
                    metric_name="household_avg_haz"
                ))
        
        # Daily costs
        if not program_log.empty:
            daily_costs = program_log.groupby('tanggal')['biaya_riil'].sum()
            if len(daily_costs) > 0:
                trends.append(TrendData(
                    dates=[d.strftime('%Y-%m-%d') for d in daily_costs.index],
                    values=[float(v) for v in daily_costs.values],
                    metric_name="daily_costs"
                ))
        
        # Household distribution data
        household_info_dict = {
            "income": float(household_info['pendapatan_rt']) if not pd.isna(household_info['pendapatan_rt']) else 0,
            "members": int(household_info['jumlah_anggota']) if not pd.isna(household_info['jumlah_anggota']) else 0,
            "house_ownership": int(household_info['kepemilikan_rumah']) if not pd.isna(household_info['kepemilikan_rumah']) else 0,
            "electricity_access": int(household_info['akses_listrik']) if not pd.isna(household_info['akses_listrik']) else 0,
            "internet_access": int(household_info['akses_internet']) if not pd.isna(household_info['akses_internet']) else 0
        }
        
        program_costs_breakdown = program_log.groupby('program')['biaya_riil'].sum().to_dict()
        
        distribution_data = safe_serialize_dict({
            "household_info": household_info_dict,
            "member_breakdown": {
                "adults": int(total_adults),
                "children": int(total_children),
                "adults_in_htn_program": int(htn_participants),
                "children_in_stunting_program": int(stunting_participants)
            },
            "program_costs_breakdown": {str(k): float(v) for k, v in program_costs_breakdown.items()}
        })
        
        # Household-specific alerts
        alerts = []
        if total_members == 0:
            alerts.append("⚠️ No household members found in health programs")
        elif participation_rate == 0:
            alerts.append("🔴 No household members participating in health programs")
        elif participation_rate < 0.5:
            alerts.append("⚠️ Low household program participation")
        
        household_income = household_info_dict["income"]
        if household_income < 2000000:
            alerts.append("💰 Low-income household - may need additional support")
        
        if total_cost > household_income * 0.1:
            alerts.append("💸 Program costs exceed 10% of household income")
            
        return DashboardResponse(
            summary_metrics=summary_metrics,
            trends=trends,
            distribution_data=distribution_data,
            alerts=alerts
        )
        
    except Exception as e:
        print(f"Error in household dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating household dashboard: {str(e)}")

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
        raise HTTPException(status_code=500, detail=f"Error fetching households: {str(e)}")

@app.get("/data/dusuns")
async def get_dusuns():
    """Get list of all dusuns (simulated)"""
    try:
        return {"dusuns": ["Dusun_A", "Dusun_B", "Dusun_C", "Dusun_D"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dusuns: {str(e)}")

@app.get("/data/programs")
async def get_programs():
    """Get list of all available programs"""
    try:
        programs = data_cache['costs_catalog']['program'].unique().tolist()
        return {"programs": programs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching programs: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "data_loaded": bool(data_cache),
        "datasets": list(data_cache.keys()) if data_cache else []
    }

# =============================================================================
# STARTUP EVENT
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Load data on startup"""
    print("🚀 Starting Digital Twin Health Dashboard API...")
    success = load_data()
    if not success:
        print("❌ Failed to load data - some endpoints may not work")
    else:
        print("✅ API ready to serve dashboard data")

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