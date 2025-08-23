// CRUD service functions for the Digital Twin Health Dashboard

import { apiFetch, API_ENDPOINTS } from '@/lib/api';
import {
  AdultRecord,
  AdultCreate,
  AdultUpdate,
  AdultFilters,
  ChildRecord,
  ChildCreate,
  ChildUpdate,
  ChildFilters,
  HouseholdRecord,
  HouseholdCreate,
  HouseholdUpdate,
  HouseholdFilters,
  ProgramRecord,
  ProgramCreate,
  ProgramUpdate,
  ProgramFilters,
  CrudResponse
} from '@/types/crud';

// Generic CRUD service class
class CrudService<T, TCreate, TUpdate, TFilters> {
  constructor(
    private baseEndpoint: string,
    private getByIdEndpoint: (id: number | string) => string
  ) {}

  async getAll(filters?: TFilters): Promise<T[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const url = `${this.baseEndpoint}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiFetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch records: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getById(id: number | string): Promise<T> {
    const response = await apiFetch(this.getByIdEndpoint(id));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch record: ${response.statusText}`);
    }
    
    return response.json();
  }

  async create(data: TCreate): Promise<T> {
    const response = await apiFetch(this.baseEndpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create record: ${response.statusText}`);
    }
    
    return response.json();
  }

  async update(id: number | string, data: TUpdate): Promise<T> {
    const response = await apiFetch(this.getByIdEndpoint(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update record: ${response.statusText}`);
    }
    
    return response.json();
  }

  async delete(id: number | string): Promise<CrudResponse> {
    const response = await apiFetch(this.getByIdEndpoint(id), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete record: ${response.statusText}`);
    }
    
    return response.json();
  }

  async bulkCreate(data: TCreate[]): Promise<CrudResponse> {
    const response = await apiFetch(`${this.baseEndpoint}bulk/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to bulk create records: ${response.statusText}`);
    }
    
    return response.json();
  }
}

// Adult service
export const adultService = new CrudService<AdultRecord, AdultCreate, AdultUpdate, AdultFilters>(
  API_ENDPOINTS.ADULTS,
  API_ENDPOINTS.ADULT_BY_ID
);

// Child service  
export const childService = new CrudService<ChildRecord, ChildCreate, ChildUpdate, ChildFilters>(
  API_ENDPOINTS.CHILDREN,
  API_ENDPOINTS.CHILD_BY_ID
);

// Household service
export const householdService = new CrudService<HouseholdRecord, HouseholdCreate, HouseholdUpdate, HouseholdFilters>(
  API_ENDPOINTS.HOUSEHOLDS,
  API_ENDPOINTS.HOUSEHOLD_BY_ID
);

// Program service
export const programService = new CrudService<ProgramRecord, ProgramCreate, ProgramUpdate, ProgramFilters>(
  API_ENDPOINTS.PROGRAMS,
  API_ENDPOINTS.PROGRAM_BY_ID
);

// Export individual service functions for convenience
export const crudServices = {
  adults: adultService,
  children: childService,
  households: householdService,
  programs: programService,
};

export default crudServices;
