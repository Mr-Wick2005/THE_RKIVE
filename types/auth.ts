import { Department } from './department';
import { Database, UserRole } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type { UserRole };

export interface ProfileWithDepartment extends Profile {
  department?: Department | null;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}

export interface AuthSessionState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isDepartmentAdmin: boolean;
}
