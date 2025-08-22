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
    alerts: List[str]
    time_info: Dict[str, Any]  # Added time information

# =============================================================================
# OVERALL DASHBOARD MODULE
# =============================================================================

@app.get("/dashboard/overall", response_model=SeparatedDashboardResponse)
async def get_overall_dashboard(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    time_period: Optional[str] = Query("1", description="Time period in months (1, 3, or 12)")
):
    """
    Get overall system-wide dashboard metrics with separated hypertension and stunting sections
    """
    try:
        adults_df = data_cache['adults'].copy()
        children_df = data_cache['children'].copy()
        program_log = data_cache['program_log'].copy()
        
        # Parse time period
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
            start_dt = end_dt - timedelta(days=period_months * 30)  # Approximate month calculation
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
        if pd.isna(bp_improvement):
            bp_improvement = 0

        # HTN program costs
        htn_program_log = program_log[program_log['program'].str.contains('htn|hypertension|tension', case=False, na=False)]
        htn_total_cost = htn_program_log['biaya_riil'].sum()
        htn_cost_per_participant = htn_total_cost / htn_participants if htn_participants > 0 else 0
        
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
                "values": [float(v) for v in monthly_bp.values],
                "metric_name": "avg_blood_pressure"
            })
        
        monthly_htn_participation = adults_df.groupby(adults_df['date'].dt.to_period('M'))['on_treatment'].mean()
        if len(monthly_htn_participation) > 0:
            htn_trends.append({
                "dates": [str(d) for d in monthly_htn_participation.index],
                "values": [float(v) for v in monthly_htn_participation.values],
                "metric_name": "htn_participation_rate"
            })
        
        hypertension_metrics = HypertensionMetrics(
            total_adults=int(htn_total),
            adults_on_treatment=int(htn_participants),
            participation_rate=float(round(htn_participation_rate, 3)),
            avg_bp_reduction=float(round(bp_improvement, 2)),
            program_cost=float(int(htn_total_cost)),
            cost_per_participant=float(int(htn_cost_per_participant))
        )
        
        # ========== STUNTING SECTION ==========
        stunting_total = children_df['child_id'].nunique()
        stunting_participants = children_df[children_df['on_program'] == 1]['child_id'].nunique()
        stunting_participation_rate = stunting_participants / stunting_total if stunting_total > 0 else 0
        
        # Calculate HAZ improvement
        haz_improvement = children_df['haz_change_this_month'].mean()
        if pd.isna(haz_improvement):
            haz_improvement = 0
        
        # Stunting program costs
        stunting_program_log = program_log[program_log['program'].str.contains('stunt|gizi|nutrition', case=False, na=False)]
        stunting_total_cost = stunting_program_log['biaya_riil'].sum()
        stunting_cost_per_participant = stunting_total_cost / stunting_participants if stunting_participants > 0 else 0
        
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
                "values": [float(v) for v in monthly_haz.values],
                "metric_name": "avg_haz_score"
            })
        
        monthly_stunting_participation = children_df.groupby(children_df['date'].dt.to_period('M'))['on_program'].mean()
        if len(monthly_stunting_participation) > 0:
            stunting_trends.append({
                "dates": [str(d) for d in monthly_stunting_participation.index],
                "values": [float(v) for v in monthly_stunting_participation.values],
                "metric_name": "stunting_participation_rate"
            })
        
        stunting_metrics = StuntingMetrics(
            total_children=int(stunting_total),
            children_on_program=int(stunting_participants),
            participation_rate=float(round(stunting_participation_rate, 3)),
            avg_haz_improvement=float(round(haz_improvement, 3)),
            program_cost=float(int(stunting_total_cost)),
            cost_per_participant=float(int(stunting_cost_per_participant))
        )
        
        # ========== COMBINED METRICS ==========
        total_program_cost = program_log['biaya_riil'].sum()
        total_participants = htn_total + stunting_total
        total_program_participants = htn_participants + stunting_participants
        overall_participation_rate = total_program_participants / total_participants if total_participants > 0 else 0
        
        # Program distribution
        program_distribution = program_log['program'].value_counts().to_dict()
        program_dist_clean = {str(k): int(v) for k, v in program_distribution.items()}
        
        # Monthly cost trends for all programs
        monthly_costs = program_log.groupby(program_log['tanggal'].dt.to_period('M'))['biaya_riil'].sum()
        cost_trends = []
        if len(monthly_costs) > 0:
            cost_trends.append({
                "dates": [str(d) for d in monthly_costs.index],
                "values": [float(v) for v in monthly_costs.values],
                "metric_name": "monthly_total_costs"
            })
        
        combined_metrics = {
            "total_participants": int(total_participants),
            "total_program_participants": int(total_program_participants),
            "overall_participation_rate": float(round(overall_participation_rate, 3)),
            "total_program_cost": float(int(total_program_cost)),
            "program_distribution": program_dist_clean,
            "cost_trends": cost_trends
        }
        
        # ========== ALERTS ==========
        alerts = []
        if htn_participation_rate < 0.5:
            alerts.append("⚠️ Low hypertension program participation rate")
        if stunting_participation_rate < 0.5:
            alerts.append("⚠️ Low stunting program participation rate")
        if bp_improvement < 0:
            alerts.append("🔴 Blood pressure trends showing deterioration")
        if haz_improvement < 0:
            alerts.append("🔴 HAZ scores trends showing deterioration")
        if htn_cost_per_participant > 300000:
            alerts.append("💰 High cost per hypertension participant")
        if stunting_cost_per_participant > 200000:
            alerts.append("💰 High cost per stunting participant")
            
        return SeparatedDashboardResponse(
            hypertension_section={
                "metrics": hypertension_metrics.dict(),
                "age_distribution": htn_age_dist,
                "trends": htn_trends,
                "cost_analysis": {
                    "total_cost": float(int(htn_total_cost)),
                    "cost_per_participant": float(int(htn_cost_per_participant)),
                    "cost_effectiveness": float(htn_cost_per_participant / abs(bp_improvement)) if bp_improvement != 0 else 0
                }
            },
            stunting_section={
                "metrics": stunting_metrics.dict(),
                "age_distribution": stunting_age_dist,
                "trends": stunting_trends,
                "cost_analysis": {
                    "total_cost": float(int(stunting_total_cost)),
                    "cost_per_participant": float(int(stunting_cost_per_participant)),
                    "cost_effectiveness": float(stunting_cost_per_participant / abs(haz_improvement)) if haz_improvement != 0 else 0
                }
            },
            combined_metrics=combined_metrics,
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
        raise HTTPException(status_code=500, detail=f"Error generating overall dashboard: {str(e)}")

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
            raise HTTPException(status_code=404, detail=f"Dusun {dusun_id} not found")
        
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
        raise HTTPException(status_code=500, detail=f"Error generating dusun dashboard: {str(e)}")

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
        raise HTTPException(status_code=500, detail=f"Error generating household dashboard: {str(e)}")

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
        raise HTTPException(status_code=500, detail=f"Error generating analytics summary: {str(e)}")

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
        raise HTTPException(status_code=500, detail=f"Error generating detailed trends: {str(e)}")

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