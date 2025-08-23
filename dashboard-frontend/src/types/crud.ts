// Type definitions for the Digital Twin Health Dashboard CRUD operations

export interface AdultRecord {
  id?: number;
  person_id: string;
  household_id: string;
  date: string; // ISO date string
  month: number;
  age: number;
  sistol: number; // systolic blood pressure
  diastol: number; // diastolic blood pressure
  on_treatment?: boolean;
  diabetes_koin?: boolean;
  perokok?: boolean; // smoker
  adherence_current?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdultCreate {
  person_id: string;
  household_id: string;
  date: string;
  month: number;
  age: number;
  sistol: number;
  diastol: number;
  on_treatment?: boolean;
  diabetes_koin?: boolean;
  perokok?: boolean;
  adherence_current?: number;
}

export interface AdultUpdate {
  person_id?: string;
  household_id?: string;
  date?: string;
  month?: number;
  age?: number;
  sistol?: number;
  diastol?: number;
  on_treatment?: boolean;
  diabetes_koin?: boolean;
  perokok?: boolean;
  adherence_current?: number;
}

export interface ChildRecord {
  id?: number;
  child_id: string;
  household_id: string;
  date: string;
  month: number;
  usia_bulan: number; // age in months
  HAZ: number; // Height-for-Age Z-score
  on_program?: boolean;
  anemia_hb_gdl?: number | null;
  air_bersih?: boolean; // clean water
  jamban_sehat?: boolean; // healthy toilet
  haz_change_this_month?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChildCreate {
  child_id: string;
  household_id: string;
  date: string;
  month: number;
  usia_bulan: number;
  HAZ: number;
  on_program?: boolean;
  anemia_hb_gdl?: number | null;
  air_bersih?: boolean;
  jamban_sehat?: boolean;
  haz_change_this_month?: number;
}

export interface ChildUpdate {
  child_id?: string;
  household_id?: string;
  date?: string;
  month?: number;
  usia_bulan?: number;
  HAZ?: number;
  on_program?: boolean;
  anemia_hb_gdl?: number | null;
  air_bersih?: boolean;
  jamban_sehat?: boolean;
  haz_change_this_month?: number;
}

export interface HouseholdRecord {
  id?: number;
  household_id: string;
  pendapatan_rt: number; // household income
  kepemilikan_rumah?: boolean; // house ownership
  akses_listrik?: boolean; // electricity access
  akses_internet?: boolean; // internet access
  created_at?: string;
  updated_at?: string;
}

export interface HouseholdCreate {
  household_id: string;
  pendapatan_rt: number;
  kepemilikan_rumah?: boolean;
  akses_listrik?: boolean;
  akses_internet?: boolean;
}

export interface HouseholdUpdate {
  household_id?: string;
  pendapatan_rt?: number;
  kepemilikan_rumah?: boolean;
  akses_listrik?: boolean;
  akses_internet?: boolean;
}

export interface ProgramRecord {
  id?: number;
  program: string;
  target_id: string;
  household_id: string;
  tanggal: string; // date
  biaya_riil: number; // actual cost
  status?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProgramCreate {
  program: string;
  target_id: string;
  household_id: string;
  tanggal: string;
  biaya_riil: number;
  status?: string;
  description?: string | null;
}

export interface ProgramUpdate {
  program?: string;
  target_id?: string;
  household_id?: string;
  tanggal?: string;
  biaya_riil?: number;
  status?: string;
  description?: string | null;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export interface AdultFilters extends PaginationParams {
  household_id?: string;
  person_id?: string;
}

export interface ChildFilters extends PaginationParams {
  household_id?: string;
  child_id?: string;
}

export interface HouseholdFilters extends PaginationParams {
  household_id?: string;
}

export interface ProgramFilters extends PaginationParams {
  household_id?: string;
  target_id?: string;
  program?: string;
  status?: string;
}

// CRUD Operations Response
export interface CrudResponse {
  message: string;
  affected_rows?: number;
  data?: unknown;
}

// Field Labels for UI
export const FIELD_LABELS = {
  // Adult fields
  person_id: 'Person ID',
  household_id: 'Household ID',
  date: 'Date',
  month: 'Month',
  age: 'Age',
  sistol: 'Systolic BP',
  diastol: 'Diastolic BP',
  on_treatment: 'On Treatment',
  diabetes_koin: 'Has Diabetes',
  perokok: 'Smoker',
  adherence_current: 'Treatment Adherence',
  
  // Child fields
  child_id: 'Child ID',
  usia_bulan: 'Age (Months)',
  HAZ: 'Height-for-Age Z-score',
  on_program: 'On Program',
  anemia_hb_gdl: 'Hemoglobin (g/dL)',
  air_bersih: 'Clean Water Access',
  jamban_sehat: 'Healthy Toilet',
  haz_change_this_month: 'HAZ Change This Month',
  
  // Household fields
  pendapatan_rt: 'Household Income',
  kepemilikan_rumah: 'House Ownership',
  akses_listrik: 'Electricity Access',
  akses_internet: 'Internet Access',
  
  // Program fields
  program: 'Program Name',
  target_id: 'Target ID',
  tanggal: 'Date',
  biaya_riil: 'Actual Cost',
  status: 'Status',
  description: 'Description'
} as const;
