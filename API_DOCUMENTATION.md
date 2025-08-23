# Digital Twin Health Dashboard API Documentation

## Overview

The Digital Twin Health Dashboard API is a comprehensive REST API for managing health program data with full CRUD operations, ML predictions, and secure authentication. This API supports both CSV file-based data and database operations.

## Version: 3.0.0

### Key Features
- **Full CRUD Operations** for Adults, Children, Households, and Programs
- **Secure API Key Authentication** using Bearer tokens
- **Database Integration** with SQLAlchemy (SQLite by default)
- **CSV Data Migration** to database
- **ML-Enhanced Predictions** for health outcomes
- **Risk Factor Analysis** with visualization data
- **Dashboard Analytics** with real-time metrics
- **Bulk Operations** for efficient data management
- **Data Export** capabilities

## Authentication

All protected endpoints require API key authentication using Bearer tokens.

### Authentication Header Format
```
Authorization: Bearer <your_api_key>
```

### Getting Your API Key
Your API key is stored in the `.env` file:
```
API_KEY=HhKFutk_z8EwqwKuxJjs513BUGyJviVloEjApeu4D1c
```

### Test Authentication
```bash
curl -X GET "http://localhost:8091/auth/test" \
  -H "Authorization: Bearer HhKFutk_z8EwqwKuxJjs513BUGyJviVloEjApeu4D1c"
```

## Environment Configuration

The API uses environment variables for configuration. Create a `.env` file:

```bash
# Digital Twin Health Dashboard API Configuration
API_KEY=your_secure_api_key_here
DATABASE_URL=sqlite:///./digital_twin.db
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Database Schema

### Adults Table
- `id`: Primary key (auto-generated)
- `person_id`: Unique person identifier
- `household_id`: Foreign key to households
- `date`: Record date
- `month`: Month number
- `age`: Person's age
- `sistol`: Systolic blood pressure
- `diastol`: Diastolic blood pressure
- `on_treatment`: Treatment status (boolean)
- `diabetes_koin`: Diabetes status (boolean)
- `perokok`: Smoking status (boolean)
- `adherence_current`: Treatment adherence (0.0-1.0)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

### Children Table
- `id`: Primary key (auto-generated)
- `child_id`: Unique child identifier
- `household_id`: Foreign key to households
- `date`: Record date
- `month`: Month number
- `usia_bulan`: Age in months
- `HAZ`: Height-for-age Z-score
- `on_program`: Program participation (boolean)
- `anemia_hb_gdl`: Hemoglobin level
- `air_bersih`: Clean water access (boolean)
- `jamban_sehat`: Sanitation access (boolean)
- `haz_change_this_month`: Monthly HAZ change
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

### Households Table
- `id`: Primary key (auto-generated)
- `household_id`: Unique household identifier
- `pendapatan_rt`: Household income
- `kepemilikan_rumah`: House ownership (boolean)
- `akses_listrik`: Electricity access (boolean)
- `akses_internet`: Internet access (boolean)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

### Programs Table
- `id`: Primary key (auto-generated)
- `program`: Program name
- `target_id`: Target person/child ID
- `household_id`: Foreign key to households
- `tanggal`: Program date
- `biaya_riil`: Actual cost
- `status`: Program status
- `description`: Program description
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

## API Endpoints

### Authentication Endpoints

#### Test Authentication
```http
GET /auth/test
Authorization: Bearer <api_key>
```

#### Get Authentication Info
```http
GET /auth/info
```

### CRUD Operations

#### Adults

**Create Adult**
```http
POST /adults/
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "person_id": "P001",
  "household_id": "H001",
  "date": "2024-01-15T00:00:00",
  "month": 1,
  "age": 45,
  "sistol": 140.0,
  "diastol": 90.0,
  "on_treatment": true,
  "diabetes_koin": false,
  "perokok": false,
  "adherence_current": 0.85
}
```

**Get Adults**
```http
GET /adults/?skip=0&limit=100&household_id=H001
Authorization: Bearer <api_key>
```

**Get Specific Adult**
```http
GET /adults/{adult_id}
Authorization: Bearer <api_key>
```

**Update Adult**
```http
PUT /adults/{adult_id}
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "sistol": 135.0,
  "on_treatment": true,
  "adherence_current": 0.9
}
```

**Delete Adult**
```http
DELETE /adults/{adult_id}
Authorization: Bearer <api_key>
```

#### Children

**Create Child**
```http
POST /children/
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "child_id": "C001",
  "household_id": "H001",
  "date": "2024-01-15T00:00:00",
  "month": 1,
  "usia_bulan": 24,
  "HAZ": -1.5,
  "on_program": true,
  "anemia_hb_gdl": 11.2,
  "air_bersih": true,
  "jamban_sehat": true,
  "haz_change_this_month": 0.1
}
```

**Get Children**
```http
GET /children/?skip=0&limit=100&household_id=H001
Authorization: Bearer <api_key>
```

**Update Child**
```http
PUT /children/{record_id}
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "HAZ": -1.2,
  "on_program": true,
  "haz_change_this_month": 0.3
}
```

#### Households

**Create Household**
```http
POST /households/
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "household_id": "H001",
  "pendapatan_rt": 2500000.0,
  "kepemilikan_rumah": true,
  "akses_listrik": true,
  "akses_internet": false
}
```

**Get Households**
```http
GET /households/?skip=0&limit=100
Authorization: Bearer <api_key>
```

**Update Household**
```http
PUT /households/{household_id}
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "pendapatan_rt": 2800000.0,
  "akses_internet": true
}
```

#### Programs

**Create Program**
```http
POST /programs/
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "program": "Hypertension Management",
  "target_id": "P001",
  "household_id": "H001",
  "tanggal": "2024-01-15T00:00:00",
  "biaya_riil": 150000.0,
  "status": "active",
  "description": "Monthly blood pressure monitoring"
}
```

### Bulk Operations

**Bulk Create Adults**
```http
POST /adults/bulk/
Authorization: Bearer <api_key>
Content-Type: application/json

[
  {
    "person_id": "P001",
    "household_id": "H001",
    ...
  },
  {
    "person_id": "P002",
    "household_id": "H002",
    ...
  }
]
```

### Data Migration

**Migrate CSV to Database**
```http
POST /data/migrate-csv/
Authorization: Bearer <api_key>
```

### Dashboard Endpoints

**Overall Dashboard**
```http
GET /dashboard/overall?start_date=2024-01-01&end_date=2024-12-31&time_period=12&use_database=true
```

**Dusun Dashboard**
```http
GET /dashboard/dusun/{dusun_id}?use_database=true
```

**Household Dashboard**
```http
GET /dashboard/household/{household_id}?use_database=true
```

### ML Prediction Endpoints

**Health Outcome Predictions**
```http
GET /predictions/health-outcomes/{person_id}?months_ahead=6&intervention_scenario=enhanced
Authorization: Bearer <api_key>
```

**Population Risk Predictions**
```http
GET /predictions/population-risk?population_type=adults&risk_threshold=0.7
Authorization: Bearer <api_key>
```

**Treatment Response Prediction**
```http
GET /predictions/treatment-response/{person_id}?intervention_type=ACEi&duration_months=6&adherence_scenario=0.8
Authorization: Bearer <api_key>
```

### Data Analytics

**Data Statistics**
```http
GET /data/statistics?use_database=true
Authorization: Bearer <api_key>
```

**Export Data**
```http
GET /data/export?format=json&table=all&use_database=true
Authorization: Bearer <api_key>
```

### Risk Factor Analysis

**Hypertension Risk Factors**
```http
GET /risk-factors/hypertension?time_period=12
```

**Stunting Risk Factors**
```http
GET /risk-factors/stunting?time_period=12
```

**Comparative Risk Analysis**
```http
GET /risk-factors/comparative?time_period=12
```

## Error Handling

The API uses standard HTTP status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid API key)
- `404`: Not Found
- `500`: Internal Server Error

### Error Response Format
```json
{
  "detail": "Error message describing what went wrong"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production use.

## Data Validation

All input data is validated using Pydantic models. The API will return validation errors for:
- Missing required fields
- Invalid data types
- Out-of-range values
- Invalid date formats

## Usage Examples

### Python Client Example

```python
import requests
import json

API_BASE_URL = "http://localhost:8091"
API_KEY = "HhKFutk_z8EwqwKuxJjs513BUGyJviVloEjApeu4D1c"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Create a new adult record
adult_data = {
    "person_id": "P001",
    "household_id": "H001",
    "date": "2024-01-15T00:00:00",
    "month": 1,
    "age": 45,
    "sistol": 140.0,
    "diastol": 90.0,
    "on_treatment": True,
    "diabetes_koin": False,
    "perokok": False,
    "adherence_current": 0.85
}

response = requests.post(
    f"{API_BASE_URL}/adults/",
    headers=headers,
    json=adult_data
)

if response.status_code == 200:
    print("Adult created successfully:", response.json())
else:
    print("Error:", response.json())

# Get dashboard data
dashboard_response = requests.get(
    f"{API_BASE_URL}/dashboard/overall?use_database=true"
)
print("Dashboard data:", dashboard_response.json())
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8091';
const API_KEY = 'HhKFutk_z8EwqwKuxJjs513BUGyJviVloEjApeu4D1c';

const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
};

// Create a new household
const householdData = {
    household_id: 'H001',
    pendapatan_rt: 2500000.0,
    kepemilikan_rumah: true,
    akses_listrik: true,
    akses_internet: false
};

axios.post(`${API_BASE_URL}/households/`, householdData, { headers })
    .then(response => {
        console.log('Household created:', response.data);
    })
    .catch(error => {
        console.error('Error:', error.response.data);
    });

// Get data statistics
axios.get(`${API_BASE_URL}/data/statistics?use_database=true`, { headers })
    .then(response => {
        console.log('Statistics:', response.data);
    })
    .catch(error => {
        console.error('Error:', error.response.data);
    });
```

## Deployment Considerations

### Production Setup

1. **Environment Variables**: Ensure all sensitive data is in environment variables
2. **Database**: Use PostgreSQL or MySQL for production instead of SQLite
3. **API Key Security**: Use strong, randomly generated API keys
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Implement rate limiting to prevent abuse
6. **Logging**: Configure comprehensive logging
7. **Monitoring**: Set up health checks and monitoring

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8091

CMD ["uvicorn", "dashboard_server_fixed:app", "--host", "0.0.0.0", "--port", "8091"]
```

### Security Best Practices

1. Keep API keys secure and rotate them regularly
2. Use HTTPS for all communications
3. Implement input validation and sanitization
4. Use parameterized queries to prevent SQL injection
5. Log security events
6. Implement proper error handling that doesn't leak sensitive information

## Support

For support and questions:
- Check the API documentation at `/docs` or `/redoc`
- Review error messages for specific guidance
- Ensure proper authentication headers are included
- Verify data formats match the expected schema

## Changelog

### Version 3.0.0
- Added full CRUD operations for all entities
- Implemented secure API key authentication
- Added database integration with SQLAlchemy
- Enhanced ML prediction endpoints
- Added bulk operations and data migration
- Improved error handling and validation
- Added comprehensive documentation

### Version 2.0.0
- Added risk factor analysis
- Enhanced dashboard functionality
- Improved data visualization support

### Version 1.0.0
- Initial release with basic dashboard functionality
- CSV file-based data storage
- Basic health metrics calculation
