// ============================================================================
// LAYANAN CRUD UNTUK SISTEM DIGITAL TWIN KESEHATAN
// ============================================================================
// File ini berisi semua layanan untuk operasi Create, Read, Update, Delete
// dalam bahasa Indonesia untuk kemudahan penggunaan tim lokal
// ============================================================================

import { apiFetch, API_ENDPOINTS } from './api';

// Import types dari model data
import { 
  AdultRecord, 
  AdultCreate, 
  ChildRecord, 
  ChildCreate, 
  HouseholdRecord, 
  HouseholdCreate,
  ProgramRecord,
  ProgramCreate,
  PaginatedResponse
} from '@/types/crud-models';

// ============================================================================
// LAYANAN CRUD UNTUK DATA DEWASA (ADULTS)
// ============================================================================

export const adultsService = {
  // Mengambil semua data dewasa dengan pagination client-side dan grouping by person
  async getAll(page = 1, size = 50, groupByPerson = false): Promise<PaginatedResponse<AdultRecord>> {
    const response = await apiFetch(`${API_ENDPOINTS.ADULTS}?limit=5000`); // Get all data
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    let processedData = data;
    
    if (groupByPerson) {
      // Group by person_id and get latest record for each person
      const groupedData = new Map<string, AdultRecord>();
      
      data.forEach(record => {
        const existingRecord = groupedData.get(record.person_id);
        if (!existingRecord || new Date(record.date) > new Date(existingRecord.date)) {
          groupedData.set(record.person_id, record);
        }
      });
      
      processedData = Array.from(groupedData.values());
    }
    
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    
    return {
      items: processedData.slice(startIndex, endIndex),
      total: processedData.length,
      page: page,
      pages: Math.ceil(processedData.length / size),
      size: size
    };
  },

  // Mengambil riwayat time series untuk person tertentu
  async getTimeSeriesByPerson(personId: string): Promise<AdultRecord[]> {
    const response = await apiFetch(`${API_ENDPOINTS.ADULTS}?limit=5000`);
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    return data
      .filter(record => record.person_id === personId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  // Mengambil data dewasa berdasarkan ID
  async getById(id: string | number): Promise<AdultRecord> {
    const response = await apiFetch(API_ENDPOINTS.ADULT_BY_ID(id));
    return response.json();
  },

  // Membuat data dewasa baru
  async create(data: AdultCreate): Promise<AdultRecord> {
    const response = await apiFetch(API_ENDPOINTS.ADULTS, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Memperbarui data dewasa
  async update(id: string | number, data: Partial<AdultCreate>): Promise<AdultRecord> {
    const response = await apiFetch(API_ENDPOINTS.ADULT_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Menghapus data dewasa
  async delete(id: string | number): Promise<void> {
    await apiFetch(API_ENDPOINTS.ADULT_BY_ID(id), {
      method: 'DELETE'
    });
  },

  // Mencari data dewasa dengan pagination client-side
  async search(query: string, page = 1, size = 50): Promise<PaginatedResponse<AdultRecord>> {
    const response = await apiFetch(`${API_ENDPOINTS.ADULTS}?limit=5000`); // Get all data
    const data = await response.json();
    
    // Filter data berdasarkan query di frontend
    const filteredData = Array.isArray(data) ? data.filter(adult => 
      adult.person_id?.toLowerCase().includes(query.toLowerCase()) ||
      adult.household_id?.toLowerCase().includes(query.toLowerCase())
    ) : [];
    
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedItems = filteredData.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      total: filteredData.length,
      page: page,
      pages: Math.ceil(filteredData.length / size),
      size: size
    };
  }
};

// ============================================================================
// LAYANAN CRUD UNTUK DATA ANAK (CHILDREN)
// ============================================================================

export const childrenService = {
  // Mengambil semua data anak dengan pagination client-side dan grouping by child
  async getAll(page = 1, size = 50, groupByChild = false): Promise<PaginatedResponse<ChildRecord>> {
    const response = await apiFetch(`${API_ENDPOINTS.CHILDREN}?limit=5000`); // Get all data
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    let processedData = data;
    
    if (groupByChild) {
      // Group by child_id and get latest record for each child
      const groupedData = new Map<string, ChildRecord>();
      
      data.forEach(record => {
        const existingRecord = groupedData.get(record.child_id);
        if (!existingRecord || new Date(record.date) > new Date(existingRecord.date)) {
          groupedData.set(record.child_id, record);
        }
      });
      
      processedData = Array.from(groupedData.values());
    }
    
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    
    return {
      items: processedData.slice(startIndex, endIndex),
      total: processedData.length,
      page: page,
      pages: Math.ceil(processedData.length / size),
      size: size
    };
  },

  // Mengambil riwayat time series untuk child tertentu
  async getTimeSeriesByChild(childId: string): Promise<ChildRecord[]> {
    const response = await apiFetch(`${API_ENDPOINTS.CHILDREN}?limit=5000`);
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    return data
      .filter(record => record.child_id === childId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  // Mengambil data anak berdasarkan ID
  async getById(id: string | number): Promise<ChildRecord> {
    const response = await apiFetch(API_ENDPOINTS.CHILD_BY_ID(id));
    return response.json();
  },

  // Membuat data anak baru
  async create(data: ChildCreate): Promise<ChildRecord> {
    const response = await apiFetch(API_ENDPOINTS.CHILDREN, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Memperbarui data anak
  async update(id: string | number, data: Partial<ChildCreate>): Promise<ChildRecord> {
    const response = await apiFetch(API_ENDPOINTS.CHILD_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Menghapus data anak
  async delete(id: string | number): Promise<void> {
    await apiFetch(API_ENDPOINTS.CHILD_BY_ID(id), {
      method: 'DELETE'
    });
  },

  // Mencari data anak dengan pagination client-side
  async search(query: string, page = 1, size = 50): Promise<PaginatedResponse<ChildRecord>> {
    const response = await apiFetch(`${API_ENDPOINTS.CHILDREN}?limit=5000`); // Get all data
    const data = await response.json();
    
    // Filter data berdasarkan query di frontend
    const filteredData = Array.isArray(data) ? data.filter(child => 
      child.child_id?.toLowerCase().includes(query.toLowerCase()) ||
      child.household_id?.toLowerCase().includes(query.toLowerCase())
    ) : [];
    
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedItems = filteredData.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      total: filteredData.length,
      page: page,
      pages: Math.ceil(filteredData.length / size),
      size: size
    };
  }
};

// ============================================================================
// LAYANAN CRUD UNTUK DATA RUMAH TANGGA (HOUSEHOLDS)
// ============================================================================

export const householdsService = {
  // Mengambil semua data rumah tangga dengan pagination client-side
  async getAll(page = 1, size = 50): Promise<PaginatedResponse<HouseholdRecord>> {
    const response = await apiFetch(`${API_ENDPOINTS.HOUSEHOLDS}?size=1000`); // Get more data
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    
    return {
      items: data.slice(startIndex, endIndex),
      total: data.length,
      page: page,
      pages: Math.ceil(data.length / size),
      size: size
    };
  },

  // Mengambil data rumah tangga berdasarkan ID
  async getById(id: string | number): Promise<HouseholdRecord> {
    const response = await apiFetch(API_ENDPOINTS.HOUSEHOLD_BY_ID(id));
    return response.json();
  },

  // Membuat data rumah tangga baru
  async create(data: HouseholdCreate): Promise<HouseholdRecord> {
    const response = await apiFetch(API_ENDPOINTS.HOUSEHOLDS, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Memperbarui data rumah tangga
  async update(id: string | number, data: Partial<HouseholdCreate>): Promise<HouseholdRecord> {
    const response = await apiFetch(API_ENDPOINTS.HOUSEHOLD_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Menghapus data rumah tangga
  async delete(id: string | number): Promise<void> {
    await apiFetch(API_ENDPOINTS.HOUSEHOLD_BY_ID(id), {
      method: 'DELETE'
    });
  },

  // Mencari data rumah tangga dengan pagination client-side
  async search(query: string, page = 1, size = 50): Promise<PaginatedResponse<HouseholdRecord>> {
    const response = await apiFetch(`${API_ENDPOINTS.HOUSEHOLDS}?size=1000`); // Get more data
    const data = await response.json();
    
    // Filter data berdasarkan query di frontend
    const filteredData = Array.isArray(data) ? data.filter(household => 
      household.household_id?.toLowerCase().includes(query.toLowerCase()) ||
      household.village?.toLowerCase().includes(query.toLowerCase())
    ) : [];
    
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedItems = filteredData.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      total: filteredData.length,
      page: page,
      pages: Math.ceil(filteredData.length / size),
      size: size
    };
  }
};

// ============================================================================
// LAYANAN CRUD UNTUK DATA PROGRAM (PROGRAMS)
// ============================================================================

export const programsService = {
  // Mengambil semua data program dengan pagination client-side
  async getAll(page = 1, size = 50): Promise<PaginatedResponse<ProgramRecord>> {
    const response = await apiFetch(`${API_ENDPOINTS.PROGRAMS}?limit=10000`); // Get all program data
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    
    return {
      items: data.slice(startIndex, endIndex),
      total: data.length,
      page: page,
      pages: Math.ceil(data.length / size),
      size: size
    };
  },

  // Mengambil data program berdasarkan ID
  async getById(id: string | number): Promise<ProgramRecord> {
    const response = await apiFetch(API_ENDPOINTS.PROGRAM_BY_ID(id));
    return response.json();
  },

  // Membuat data program baru
  async create(data: ProgramCreate): Promise<ProgramRecord> {
    const response = await apiFetch(API_ENDPOINTS.PROGRAMS, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Memperbarui data program
  async update(id: string | number, data: Partial<ProgramCreate>): Promise<ProgramRecord> {
    const response = await apiFetch(API_ENDPOINTS.PROGRAM_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Menghapus data program
  async delete(id: string | number): Promise<void> {
    await apiFetch(API_ENDPOINTS.PROGRAM_BY_ID(id), {
      method: 'DELETE'
    });
  },

  // Mencari data program dengan pagination client-side
  async search(query: string, page = 1, size = 50): Promise<PaginatedResponse<ProgramRecord>> {
    const response = await apiFetch(`${API_ENDPOINTS.PROGRAMS}?size=1000`); // Get more data
    const data = await response.json();
    
    // Filter data berdasarkan query di frontend
    const filteredData = Array.isArray(data) ? data.filter(program => 
      program.household_id?.toLowerCase().includes(query.toLowerCase()) ||
      program.program?.toLowerCase().includes(query.toLowerCase())
    ) : [];
    
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedItems = filteredData.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      total: filteredData.length,
      page: page,
      pages: Math.ceil(filteredData.length / size),
      size: size
    };
  }
};

// ============================================================================
// EXPORT SEMUA LAYANAN
// ============================================================================

const crudServices = {
  adults: adultsService,
  children: childrenService,
  households: householdsService,
  programs: programsService
};

export default crudServices;
