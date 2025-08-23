// API configuration and utilities
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8091';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';
const USE_DATABASE = process.env.NEXT_PUBLIC_USE_DATABASE === 'true';

// API headers with authentication
export const getApiHeaders = () => ({
  'Content-Type': 'application/json',
  ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
});

// API fetch wrapper with authentication
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: getApiHeaders(),
    ...options
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Dashboard endpoints
  DASHBOARD_OVERALL: (useDb: boolean = USE_DATABASE) => `/dashboard/overall?use_database=${useDb}`,
  DASHBOARD_DUSUN: (dusunId: string, useDb: boolean = USE_DATABASE) => `/dashboard/dusun/${dusunId}?use_database=${useDb}`,
  DASHBOARD_HOUSEHOLD: (householdId: string, useDb: boolean = USE_DATABASE) => `/dashboard/household/${householdId}?use_database=${useDb}`,
  
  // Risk factors
  RISK_FACTORS_HYPERTENSION: (timePeriod: string) => `/risk-factors/hypertension?time_period=${timePeriod}`,
  RISK_FACTORS_STUNTING: (timePeriod: string) => `/risk-factors/stunting?time_period=${timePeriod}`,
  
  // Predictions
  HEALTH_OUTCOMES: (personId: string) => `/predictions/health-outcomes/${personId}`,
  POPULATION_RISK: (populationType: string) => `/predictions/population-risk?population_type=${populationType}`,
  TREATMENT_RESPONSE: (personId: string, interventionType: string, durationMonths: number, adherenceScenario: number) => 
    `/predictions/treatment-response/${personId}?intervention_type=${interventionType}&duration_months=${durationMonths}&adherence_scenario=${adherenceScenario}`,
  
  // Data endpoints  
  HOUSEHOLDS_DATA: (useDb: boolean = USE_DATABASE) => `/data/households?use_database=${useDb}`,
  DUSUNS: (useDb: boolean = USE_DATABASE) => `/data/dusuns?use_database=${useDb}`,
  DATA_STATISTICS: (useDb: boolean = USE_DATABASE) => `/data/statistics?use_database=${useDb}`,
  METRICS: (timePeriod: string, useDb: boolean = USE_DATABASE) => `/metrics?time_period=${timePeriod}&use_database=${useDb}`,
  
  // CRUD endpoints (require authentication)
  ADULTS: '/adults/',
  ADULT_BY_ID: (id: number | string) => `/adults/${id}`,
  ADULTS_BULK: '/adults/bulk/',
  
  CHILDREN: '/children/',
  CHILD_BY_ID: (id: number | string) => `/children/${id}`,
  CHILDREN_BULK: '/children/bulk/',
  
  HOUSEHOLDS: '/households/',
  HOUSEHOLD_BY_ID: (id: number | string) => `/households/${id}`,
  HOUSEHOLDS_BULK: '/households/bulk/',
  
  PROGRAMS: '/programs/',
  PROGRAM_BY_ID: (id: number | string) => `/programs/${id}`,
  PROGRAMS_BULK: '/programs/bulk/',
  
  // Authentication
  AUTH_TEST: '/auth/test',
  AUTH_INFO: '/auth/info',
  
  // Health check
  HEALTH: '/health'
};

export { API_BASE_URL, API_KEY, USE_DATABASE };
