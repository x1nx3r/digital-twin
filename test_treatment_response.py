#!/usr/bin/env python3

import requests
import json

# Test different parameters to see if the treatment response changes
base_url = "http://localhost:8091/predictions/treatment-response/P001"

test_cases = [
    {"intervention_type": "ACEi", "duration_months": 6, "adherence": 0.8},
    {"intervention_type": "ACEi", "duration_months": 6, "adherence": 0.5},
    {"intervention_type": "diuretik", "duration_months": 6, "adherence": 0.8},
    {"intervention_type": "lifestyle", "duration_months": 12, "adherence": 0.9},
]

print("🧪 Testing Treatment Response Variations")
print("=" * 50)

for i, params in enumerate(test_cases, 1):
    try:
        response = requests.get(base_url, params=params)
        if response.status_code == 200:
            data = response.json()
            treatment = data.get('treatment_response', {})
            
            print(f"\nTest {i}: {params}")
            print(f"  Systolic: {treatment.get('hasil_prediksi', {}).get('sistolik', 'N/A')}")
            print(f"  Diastolic: {treatment.get('hasil_prediksi', {}).get('diastolik', 'N/A')}")
            print(f"  Reduction: -{treatment.get('perbaikan_yang_diharapkan', {}).get('penurunan_sistolik', 'N/A')} mmHg")
            print(f"  Success Prob: {treatment.get('probabilitas_keberhasilan', 'N/A') * 100:.0f}%")
        else:
            print(f"\nTest {i}: ERROR {response.status_code}")
    except Exception as e:
        print(f"\nTest {i}: ERROR {e}")

print("\n" + "=" * 50)
