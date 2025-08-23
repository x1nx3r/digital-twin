// Tipe data untuk model database
export interface AdultRecord {
  id?: number;
  person_id: string;
  household_id: string;
  date: string;
  month: number;
  age: number;
  sistol: number;
  diastol: number;
  on_treatment: boolean;
  diabetes_koin: boolean;
  perokok: boolean;
  keturunan_hipertensi: boolean;
  aktivitas_fisik_rendah: boolean;
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
  keturunan_hipertensi?: boolean;
  aktivitas_fisik_rendah?: boolean;
}

export interface ChildRecord {
  id?: number;
  child_id: string;
  household_id: string;
  date: string;
  month: number;
  usia_bulan: number;
  HAZ: number;
  on_program: boolean;
  anemia_hb_gdl: number;
  air_bersih: boolean;
  jamban_sehat: boolean;
  haz_change_this_month: number;
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
  anemia_hb_gdl: number;
  air_bersih?: boolean;
  jamban_sehat?: boolean;
  haz_change_this_month?: number;
}

export interface HouseholdRecord {
  id?: number;
  household_id: string;
  dusun: string;
  rt: string;
  rw: string;
  village: string;
  subdistrict: string;
  created_at?: string;
  updated_at?: string;
}

export interface HouseholdCreate {
  household_id: string;
  dusun: string;
  rt: string;
  rw: string;
  village: string;
  subdistrict: string;
}

export interface ProgramRecord {
  id?: number;
  program: string;
  target_id: string;
  household_id: string;
  tanggal: string;
  biaya_riil: number;
  status: string;
  description: string;
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
  description?: string;
}

// Tipe untuk respon API
export interface APIResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
