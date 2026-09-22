import { Database } from './database.types';

export type Department = Database['public']['Tables']['departments']['Row'];
export type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
export type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];

export interface DepartmentWithStats extends Department {
  magazine_count?: number;
  latest_magazine_year?: string;
}
