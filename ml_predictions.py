"""
Modul Prediksi ML untuk Dasbor Kesehatan Digital Twin

Modul ini menyediakan prediksi hasil kesehatan menggunakan pendekatan
statistik sederhana dan model ML dasar yang dapat bekerja tanpa pelatihan
ekstensif.

Fitur:
- Prediksi perkembangan tekanan darah
- Prediksi trajektori skor HAZ
- Skor risiko populasi dan peringatan dini
- Estimasi respons pengobatan
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

class HealthOutcomePredictor:
    """
    Prediktor hasil kesehatan sederhana yang efektif menggunakan metode statistik
    dan model ML dasar. Tidak memerlukan pelatihan ekstensif - siap pakai.
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.bp_model = None
        self.haz_model = None
        
    def predict_bp_progression(self, person_data: pd.DataFrame, months_ahead: int = 6) -> Dict[str, Any]:
        """
        Prediksi perkembangan tekanan darah untuk individu

        Menggunakan analisis tren dan pengetahuan klinis tanpa memerlukan model
        yang sudah dilatih.
        """
        try:
            # Sort by date to get progression
            person_data = person_data.sort_values('date')
            
            if len(person_data) < 2:
                # Not enough data for trend analysis, use clinical heuristics
                latest = person_data.iloc[-1]
                return self._predict_bp_heuristic(latest, months_ahead)
            
            # Extract features
            features = self._extract_bp_features(person_data)
            latest = person_data.iloc[-1]
            
            # Calculate trend
            dates = pd.to_datetime(person_data['date'])
            days_since_start = (dates - dates.min()).dt.days
            
            # Linear regression for trend
            systolic_trend = stats.linregress(days_since_start, person_data['sistol'])
            diastolic_trend = stats.linregress(days_since_start, person_data['diastol'])
            
            # Predict future BP
            days_future = months_ahead * 30
            predicted_systolic = latest['sistol'] + (systolic_trend.slope * days_future)
            predicted_diastolic = latest['diastol'] + (diastolic_trend.slope * days_future)
            
            # Apply clinical adjustments
            prediction = self._apply_clinical_adjustments(
                predicted_systolic, predicted_diastolic, features, months_ahead
            )
            
            # Calculate confidence based on trend consistency
            confidence = self._calculate_bp_confidence(person_data, systolic_trend, diastolic_trend)
            
            return {
                'person_id': latest['person_id'],
                'current_bp': {
                    'systolic': float(latest['sistol']),
                    'diastolic': float(latest['diastol'])
                },
                'predicted_bp': {
                    'systolic': round(prediction['systolic'], 1),
                    'diastolic': round(prediction['diastolic'], 1)
                },
                'trend_analysis': {
                    'systolic_trend_per_month': round(systolic_trend.slope * 30, 2),
                    'diastolic_trend_per_month': round(diastolic_trend.slope * 30, 2),
                    'trend_confidence': round(confidence, 3)
                },
                'risk_assessment': self._assess_bp_risk(prediction, features),
                'confidence_interval': {
                    'systolic': [
                        round(prediction['systolic'] - (10 * (1 - confidence)), 1),
                        round(prediction['systolic'] + (10 * (1 - confidence)), 1)
                    ],
                    'diastolic': [
                        round(prediction['diastolic'] - (7 * (1 - confidence)), 1),
                        round(prediction['diastolic'] + (7 * (1 - confidence)), 1)
                    ]
                },
                'recommendations': self._generate_bp_recommendations(prediction, features)
            }
            
        except Exception as e:
            print(f"Kesalahan memprediksi perkembangan tekanan darah: {e}")
            # Fallback to heuristic prediction
            latest = person_data.iloc[-1]
            return self._predict_bp_heuristic(latest, months_ahead)
    
    def predict_haz_progression(self, child_data: pd.DataFrame, months_ahead: int = 6) -> Dict[str, Any]:
        """
        Prediksi perkembangan skor HAZ untuk anak

        Menggunakan analisis kecepatan pertumbuhan dan standar pertumbuhan WHO
        """
        try:
            child_data = child_data.sort_values('date')
            
            if len(child_data) < 2:
                latest = child_data.iloc[-1]
                return self._predict_haz_heuristic(latest, months_ahead)
            
            # Extract features
            features = self._extract_haz_features(child_data)
            latest = child_data.iloc[-1]
            
            # Calculate growth velocity
            dates = pd.to_datetime(child_data['date'])
            months_since_start = (dates - dates.min()).dt.days / 30
            
            # HAZ trend analysis
            haz_trend = stats.linregress(months_since_start, child_data['HAZ'])
            
            # Predict future HAZ
            predicted_haz = latest['HAZ'] + (haz_trend.slope * months_ahead)
            
            # Apply growth adjustments based on age and interventions
            prediction = self._apply_growth_adjustments(predicted_haz, features, months_ahead)
            
            # Calculate confidence
            confidence = self._calculate_haz_confidence(child_data, haz_trend)
            
            return {
                'child_id': latest['child_id'],
                'current_status': {
                    'haz': float(latest['HAZ']),
                    'age_months': int(latest['usia_bulan']),
                    'stunting_status': 'stunted' if latest['HAZ'] < -2 else 'normal'
                },
                'predicted_status': {
                    'haz': round(prediction['haz'], 2),
                    'age_months': int(latest['usia_bulan'] + months_ahead),
                    'stunting_risk': 'high' if prediction['haz'] < -2 else 'medium' if prediction['haz'] < -1 else 'low'
                },
                'growth_analysis': {
                    'velocity_per_month': round(haz_trend.slope, 3),
                    'growth_pattern': self._classify_growth_pattern(haz_trend.slope),
                    'catch_up_potential': self._assess_catch_up_potential(features)
                },
                'confidence_interval': {
                    'haz_range': [
                        round(prediction['haz'] - (0.5 * (1 - confidence)), 2),
                        round(prediction['haz'] + (0.5 * (1 - confidence)), 2)
                    ],
                    'confidence_score': round(confidence, 3)
                },
                'recommendations': self._generate_haz_recommendations(prediction, features)
            }
            
        except Exception as e:
            print(f"Kesalahan memprediksi perkembangan HAZ: {e}")
            latest = child_data.iloc[-1]
            return self._predict_haz_heuristic(latest, months_ahead)
    
    def calculate_risk_scores(self, population_data: pd.DataFrame, data_type: str = 'adults') -> Dict[str, Any]:
        """
        Hitung skor risiko populasi dengan peningkatan ML

        Menggunakan gabungan metode statistik dan aturan klinis
        """
        try:
            if data_type == 'adults':
                return self._calculate_adult_risk_scores(population_data)
            else:
                return self._calculate_child_risk_scores(population_data)
                
        except Exception as e:
            print(f"Kesalahan menghitung skor risiko: {e}")
            return {'error': str(e)}
    
    # ===== HELPER METHODS =====
    
    def _extract_bp_features(self, person_data: pd.DataFrame) -> Dict[str, Any]:
        """Extract relevant features for BP prediction"""
        latest = person_data.iloc[-1]
        
        features = {
            'age': latest.get('age', latest.get('usia', 50)),
            'sex': latest.get('sex', 'M'),
            'on_treatment': latest.get('on_treatment', 0),
            'treatment_months': latest.get('treatment_months', 0),
            'adherence': latest.get('adherence_current', 0),
            'diabetes': latest.get('diabetes_koin', 0),
            'smoking': latest.get('perokok', 0),
            'bmi': latest.get('BMI', 25),
            'baseline_systolic': person_data['sistol'].iloc[0],
            'baseline_diastolic': person_data['diastol'].iloc[0],
            'bp_variability': person_data['sistol'].std(),
            'data_points': len(person_data)
        }
        
        return features
    
    def _extract_haz_features(self, child_data: pd.DataFrame) -> Dict[str, Any]:
        """Extract relevant features for HAZ prediction"""
        latest = child_data.iloc[-1]
        
        features = {
            'age_months': latest.get('usia_bulan', 24),
            'sex': latest.get('sex', 'M'),
            'on_program': latest.get('on_program', 0),
            'program_months': latest.get('program_months', 0),
            'hemoglobin': latest.get('anemia_hb_gdl', 12),
            'exclusive_bf': latest.get('ASI_eksklusif', 0),
            'complementary_feeding': latest.get('mp_asi_memadai', 0),
            'clean_water': latest.get('air_bersih', 0),
            'sanitation': latest.get('jamban_sehat', 0),
            'baseline_haz': child_data['HAZ'].iloc[0],
            'haz_variability': child_data['HAZ'].std(),
            'data_points': len(child_data)
        }
        
        return features
    
    def _apply_clinical_adjustments(self, systolic: float, diastolic: float, features: Dict, months: int) -> Dict[str, float]:
        """Apply clinical knowledge to adjust BP predictions"""
        
        # Age effect (BP tends to increase with age)
        age_adjustment = (features['age'] - 50) * 0.2 * months
        
        # Treatment effect
        treatment_effect = 0
        if features['on_treatment'] and features['adherence'] > 0:
            # Treatment reduces BP over time
            adherence_factor = features['adherence']
            treatment_effect = -15 * adherence_factor * min(1, features['treatment_months'] / 6)
        
        # Lifestyle factors
        diabetes_effect = 3 * features['diabetes'] * months
        smoking_effect = 2 * features['smoking'] * months
        
        # Apply adjustments
        adjusted_systolic = systolic + age_adjustment + treatment_effect + diabetes_effect + smoking_effect
        adjusted_diastolic = diastolic + (age_adjustment * 0.6) + (treatment_effect * 0.7) + (diabetes_effect * 0.6)
        
        # Physiological bounds
        adjusted_systolic = max(90, min(250, adjusted_systolic))
        adjusted_diastolic = max(60, min(130, adjusted_diastolic))
        
        return {
            'systolic': adjusted_systolic,
            'diastolic': adjusted_diastolic
        }
    
    def _apply_growth_adjustments(self, haz: float, features: Dict, months: int) -> Dict[str, float]:
        """Apply growth knowledge to adjust HAZ predictions"""
        
        # Age-specific growth potential (younger children have more catch-up potential)
        age_factor = max(0.1, 1 - (features['age_months'] / 60))  # Decreases with age
        
        # Program effect
        program_effect = 0
        if features['on_program']:
            # Nutrition programs can improve HAZ, especially early intervention
            program_intensity = min(1, features['program_months'] / 12)
            program_effect = 0.3 * program_intensity * age_factor * months / 6
        
        # Environmental factors
        water_sanitation_effect = 0.1 * (features['clean_water'] + features['sanitation']) * months / 6
        nutrition_effect = 0.15 * features['complementary_feeding'] * months / 6
        
        # Anemia effect (low Hb associated with poor growth)
        hb_effect = 0.1 * max(0, (features['hemoglobin'] - 11) / 4) * months / 6
        
        # Apply adjustments
        adjusted_haz = haz + program_effect + water_sanitation_effect + nutrition_effect + hb_effect
        
        # Natural bounds for HAZ
        adjusted_haz = max(-5, min(3, adjusted_haz))
        
        return {
            'haz': adjusted_haz
        }
    
    def _calculate_bp_confidence(self, data: pd.DataFrame, sys_trend, dia_trend) -> float:
        """Calculate confidence in BP prediction based on data quality"""
        
        # More data points = higher confidence
        data_confidence = min(1, len(data) / 10)
        
        # Lower trend variance = higher confidence
        trend_confidence = 1 / (1 + abs(sys_trend.stderr) + abs(dia_trend.stderr))
        
        # R-squared indicates how well trend fits
        r_squared_confidence = (sys_trend.rvalue ** 2 + dia_trend.rvalue ** 2) / 2
        
        # Combined confidence
        overall_confidence = (data_confidence * 0.3 + trend_confidence * 0.3 + r_squared_confidence * 0.4)
        
        return min(1, max(0.1, overall_confidence))
    
    def _calculate_haz_confidence(self, data: pd.DataFrame, haz_trend) -> float:
        """Calculate confidence in HAZ prediction"""
        
        data_confidence = min(1, len(data) / 8)
        trend_confidence = 1 / (1 + abs(haz_trend.stderr))
        r_squared_confidence = haz_trend.rvalue ** 2
        
        overall_confidence = (data_confidence * 0.4 + trend_confidence * 0.3 + r_squared_confidence * 0.3)
        
        return min(1, max(0.1, overall_confidence))
    
    def _assess_bp_risk(self, prediction: Dict, features: Dict) -> Dict[str, Any]:
        """Assess cardiovascular risk based on predicted BP"""
        
        systolic = prediction['systolic']
        diastolic = prediction['diastolic']
        
        # Risk scoring based on BP categories
        if systolic >= 180 or diastolic >= 110:
            risk_level = 'very_high'
            risk_score = 0.9
        elif systolic >= 160 or diastolic >= 100:
            risk_level = 'high'
            risk_score = 0.7
        elif systolic >= 140 or diastolic >= 90:
            risk_level = 'moderate'
            risk_score = 0.5
        else:
            risk_level = 'low'
            risk_score = 0.2
        
        # Adjust for additional risk factors
        if features['diabetes']:
            risk_score += 0.2
        if features['smoking']:
            risk_score += 0.15
        if features['age'] > 65:
            risk_score += 0.1
            
        risk_score = min(1, risk_score)
        
        # Human-readable label (Indonesian) while keeping programmatic 'risk_level'
        risk_label_map = {
            'very_high': 'Sangat Tinggi',
            'high': 'Tinggi',
            'moderate': 'Sedang',
            'low': 'Rendah'
        }

        return {
            'risk_level': risk_level,
            'risk_label': risk_label_map.get(risk_level, risk_level),
            'risk_score': round(risk_score, 3),
            'category': self._get_bp_category(systolic, diastolic)
        }
    
    def _assess_catch_up_potential(self, features: Dict) -> str:
        """Assess child's potential for catch-up growth"""
        
        age_months = features['age_months']
        baseline_haz = features['baseline_haz']
        
        # Younger children have higher catch-up potential
        if age_months < 24:
            if baseline_haz > -3:
                return 'high'
            elif baseline_haz > -4:
                return 'moderate'
            else:
                return 'low'
        elif age_months < 36:
            if baseline_haz > -2.5:
                return 'moderate'
            else:
                return 'low'
        else:
            return 'low'
    
    def _predict_bp_heuristic(self, latest_data: pd.Series, months_ahead: int) -> Dict[str, Any]:
        """Fallback BP prediction using clinical heuristics"""
        
        current_sys = latest_data.get('sistol', 140)
        current_dia = latest_data.get('diastol', 90)
        
        # Simple heuristic: assume gradual increase without treatment
        on_treatment = latest_data.get('on_treatment', 0)
        
        if on_treatment:
            # Assume treatment maintains or slightly improves BP
            predicted_sys = current_sys - 2
            predicted_dia = current_dia - 1
        else:
            # Assume gradual increase
            predicted_sys = current_sys + (months_ahead * 0.5)
            predicted_dia = current_dia + (months_ahead * 0.3)
        
        return {
            'person_id': latest_data.get('person_id', 'unknown'),
            'current_bp': {'systolic': float(current_sys), 'diastolic': float(current_dia)},
            'predicted_bp': {'systolic': round(predicted_sys, 1), 'diastolic': round(predicted_dia, 1)},
            'confidence_interval': {
                'systolic': [predicted_sys - 15, predicted_sys + 15],
                'diastolic': [predicted_dia - 10, predicted_dia + 10]
            },
            'method': 'heuristic',
            'recommendations': ['Disarankan pemantauan rutin', 'Pertimbangkan perubahan gaya hidup']
        }
    
    def _predict_haz_heuristic(self, latest_data: pd.Series, months_ahead: int) -> Dict[str, Any]:
        """Fallback HAZ prediction using growth heuristics"""

        current_haz = latest_data.get('HAZ', -1)
        age_months = latest_data.get('usia_bulan', 24)

        # Heuristic: assume slight improvement with age if on program
        on_program = latest_data.get('on_program', 0)

        if on_program and age_months < 36:
            # Assume program helps
            predicted_haz = current_haz + (months_ahead * 0.05)
        else:
            # Assume stable or slight decline
            predicted_haz = current_haz - (months_ahead * 0.02)

        return {
            'child_id': latest_data.get('child_id', 'unknown'),
            'current_status': {
                'haz': float(current_haz),
                'age_months': int(age_months),
                'stunting_status': 'stunted' if current_haz < -2 else 'normal'
            },
            'predicted_status': {
                'haz': round(predicted_haz, 2),
                'age_months': int(age_months + months_ahead),
                'stunting_risk': 'high' if predicted_haz < -2 else 'low'
            },
            'method': 'heuristic',
            'recommendations': ['Pantau pertumbuhan secara rutin', 'Pastikan asupan gizi memadai']
        }
    
    def _get_bp_category(self, systolic: float, diastolic: float) -> str:
        """Get BP category based on WHO/JNC guidelines"""
        
        if systolic >= 180 or diastolic >= 110:
            return 'Hipertensi Tahap 3 (Parah)'
        elif systolic >= 160 or diastolic >= 100:
            return 'Hipertensi Tahap 2'
        elif systolic >= 140 or diastolic >= 90:
            return 'Hipertensi Tahap 1'
        elif systolic >= 130 or diastolic >= 85:
            return 'Tinggi Normal'
        elif systolic >= 120 or diastolic >= 80:
            return 'Normal'
        else:
            return 'Optimal'
    
    def _classify_growth_pattern(self, velocity: float) -> str:
        """Classify growth velocity pattern"""
        
        if velocity > 0.1:
            return 'catch_up_growth'
        elif velocity > 0:
            return 'normal_growth'
        elif velocity > -0.1:
            return 'growth_faltering'
        else:
            return 'poor_growth'
    
    def _generate_bp_recommendations(self, prediction: Dict, features: Dict) -> List[str]:
        """Generate personalized BP management recommendations"""
        
        recommendations = []
        
        if prediction['systolic'] >= 160:
            recommendations.append('Segera konsultasi medis diperlukan')
            recommendations.append('Pertimbangkan rawat inap jika bergejala')
        elif prediction['systolic'] >= 140:
            recommendations.append('Tingkatkan pengobatan antihipertensi')
            recommendations.append('Pantau tekanan darah setiap minggu')
        
        if not features['on_treatment'] and prediction['systolic'] >= 140:
            recommendations.append('Mulai pengobatan antihipertensi')

        if features['smoking']:
            recommendations.append('Konseling berhenti merokok - prioritas tinggi')

        if features['diabetes']:
            recommendations.append('Optimalkan manajemen diabetes')
            recommendations.append('Target tekanan darah <130/80 mmHg')

        if features['adherence'] < 0.8:
            recommendations.append('Tingkatkan kepatuhan pengobatan melalui edukasi')

        recommendations.append('Aktivitas fisik teratur dan modifikasi pola makan')
        
        return recommendations
    
    def _generate_haz_recommendations(self, prediction: Dict, features: Dict) -> List[str]:
        """Generate personalized nutrition recommendations"""
        
        recommendations = []
        
        if prediction['haz'] < -3:
            recommendations.append('Intervensi gizi mendesak diperlukan')
            recommendations.append('Pertimbangkan program pemberian makan terapeutik')
        elif prediction['haz'] < -2:
            recommendations.append('Diperlukan dukungan gizi intensif')
            recommendations.append('Pantau pertumbuhan setiap bulan')
        
        if features['age_months'] < 24:
            recommendations.append('Fokus pada 1000 hari pertama - periode kritis')

        if not features['exclusive_bf'] and features['age_months'] < 6:
            recommendations.append('Promosikan pemberian ASI eksklusif')

        if not features['complementary_feeding'] and features['age_months'] >= 6:
            recommendations.append('Perbaiki praktik pemberian makanan pendamping ASI')

        if features['hemoglobin'] < 11:
            recommendations.append('Atasi anemia dengan suplementasi zat besi')

        if not features['clean_water'] or not features['sanitation']:
            recommendations.append('Perbaiki kondisi WASH untuk mencegah infeksi')

        if not features['on_program']:
            recommendations.append('Daftarkan pada program dukungan gizi')
        
        return recommendations

# Create global predictor instance
health_predictor = HealthOutcomePredictor()

def predict_health_outcomes(person_data: pd.DataFrame, person_type: str = 'adult', months_ahead: int = 6) -> Dict[str, Any]:
    """
    Main function to predict health outcomes
    
    Args:
        person_data: DataFrame with individual's longitudinal health data
        person_type: 'adult' or 'child'
        months_ahead: Number of months to predict ahead
    
    Returns:
        Dictionary with predictions and recommendations
    """
    
    if person_type == 'adult':
        return health_predictor.predict_bp_progression(person_data, months_ahead)
    else:
        return health_predictor.predict_haz_progression(person_data, months_ahead)

def calculate_population_risk_scores(population_data: pd.DataFrame, data_type: str = 'adults') -> Dict[str, Any]:
    """
    Calculate risk scores for entire population
    
    Args:
        population_data: DataFrame with population health data
        data_type: 'adults' or 'children'
    
    Returns:
        Dictionary with risk analysis for population
    """
    
    return health_predictor.calculate_risk_scores(population_data, data_type)
