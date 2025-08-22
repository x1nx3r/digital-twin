import requests
import json
from datetime import datetime, timedelta

# API base URL
BASE_URL = "http://localhost:8091"

def test_api():
    """Test all dashboard endpoints"""
    
    print("🧪 Testing Digital Twin Dashboard API")
    print("=" * 50)
    
    # Test health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health check: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return
    
    # Test overall dashboard
    print("\n2. Testing overall dashboard...")
    try:
        response = requests.get(f"{BASE_URL}/dashboard/overall")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Overall dashboard: {response.status_code}")
            print(f"   Total participants: {data['summary_metrics']['total_participants']}")
            print(f"   Program participants: {data['summary_metrics']['program_participants']}")
            print(f"   Participation rate: {data['summary_metrics']['participation_rate']:.1%}")
            print(f"   Total cost: Rp {data['summary_metrics']['total_program_cost']:,}")
            print(f"   Alerts: {len(data['alerts'])}")
            
            # Display distribution data
            print(f"   Age distribution: {data['distribution_data']['age_distribution']}")
            print(f"   Program distribution: {data['distribution_data']['program_distribution']}")
        else:
            print(f"❌ Overall dashboard failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ Overall dashboard error: {e}")
    
    # Test dusun dashboard
    print("\n3. Testing dusun dashboard...")
    try:
        response = requests.get(f"{BASE_URL}/dashboard/dusun/Dusun_A")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Dusun A dashboard: {response.status_code}")
            print(f"   Participants: {data['summary_metrics']['total_participants']}")
            print(f"   Participation rate: {data['summary_metrics']['participation_rate']:.1%}")
            print(f"   Household count: {data['distribution_data']['household_count']}")
        else:
            print(f"❌ Dusun dashboard failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ Dusun dashboard error: {e}")
    
    # Test household dashboard
    print("\n4. Testing household dashboard...")
    try:
        # Get first household ID
        households_response = requests.get(f"{BASE_URL}/data/households")
        if households_response.status_code == 200:
            households = households_response.json()['households']
            if households:
                first_household = households[0]['household_id']
                
                response = requests.get(f"{BASE_URL}/dashboard/household/{first_household}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Household {first_household} dashboard: {response.status_code}")
                    print(f"   Members: {data['summary_metrics']['total_participants']}")
                    print(f"   Program participants: {data['summary_metrics']['program_participants']}")
                    print(f"   Household income: Rp {data['distribution_data']['household_info']['income']:,.0f}")
                else:
                    print(f"❌ Household dashboard failed: {response.status_code}")
                    print(f"   Error: {response.text}")
            else:
                print("❌ No households found")
        else:
            print(f"❌ Failed to get households: {households_response.status_code}")
    except Exception as e:
        print(f"❌ Household dashboard error: {e}")
    
    # Test utility endpoints
    print("\n5. Testing utility endpoints...")
    
    # Test dusuns list
    try:
        response = requests.get(f"{BASE_URL}/data/dusuns")
        if response.status_code == 200:
            dusuns = response.json()['dusuns']
            print(f"✅ Dusuns list: {len(dusuns)} dusuns found")
        else:
            print(f"❌ Dusuns list failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Dusuns list error: {e}")
    
    # Test programs list
    try:
        response = requests.get(f"{BASE_URL}/data/programs")
        if response.status_code == 200:
            programs = response.json()['programs']
            print(f"✅ Programs list: {len(programs)} programs found")
            print(f"   Programs: {', '.join(programs)}")
        else:
            print(f"❌ Programs list failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Programs list error: {e}")
    
    # Test with date filters
    print("\n6. Testing date filters...")
    try:
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/dashboard/overall",
            params={'start_date': start_date, 'end_date': end_date}
        )
        if response.status_code == 200:
            print(f"✅ Date filtering works: {response.status_code}")
        else:
            print(f"❌ Date filtering failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ Date filtering error: {e}")
    
    # Test API documentation
    print("\n7. Testing API documentation...")
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print(f"✅ API documentation available at: {BASE_URL}/docs")
        else:
            print(f"⚠️  API documentation: {response.status_code}")
    except Exception as e:
        print(f"⚠️  API documentation error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 API testing completed!")
    print(f"🌐 Access interactive API docs at: {BASE_URL}/docs")
    print(f"📊 Example overall dashboard: {BASE_URL}/dashboard/overall")

if __name__ == "__main__":
    test_api()