import { redirect } from 'next/navigation';
import { getCurrentProfile, getCurrentUser } from './session';
import { Profile, UserRole } from '@/types/auth';

/**
 * Checks whether a given profile has the SUPER_ADMIN role.
 */
export function isSuperAdmin(profile: Profile | null): boolean {
  return Boolean(profile && profile.is_active && profile.role === 'SUPER_ADMIN');
}

/**
 * Checks whether a given profile has the DEPARTMENT_ADMIN role.
 */
export function isDepartmentAdmin(profile: Profile | null): boolean {
  return Boolean(profile && profile.is_active && profile.role === 'DEPARTMENT_ADMIN');
}

/**
 * Checks whether a user can manage magazines for a given department.
 * - SUPER_ADMIN can manage any department.
 * - DEPARTMENT_ADMIN can manage only their assigned department.
 */
export function canManageDepartment(
  profile: Profile | null,
  targetDepartmentId: string
): boolean {
  if (!profile || !profile.is_active) return false;
  if (profile.role === 'SUPER_ADMIN') return true;
  return profile.role === 'DEPARTMENT_ADMIN' && profile.department_id === targetDepartmentId;
}

/**
 * Checks whether a user can manage a specific magazine.
 */
export function canManageMagazine(
  profile: Profile | null,
  magazineDepartmentId: string
): boolean {
  return canManageDepartment(profile, magazineDepartmentId);
}

/**
 * Guard that ensures a user is logged in with an active profile.
 * Redirects to /admin/login if unauthenticated.
 */
export async function requireAuth(redirectTo = '/admin/login'): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  profile: Profile;
}> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectTo);
  }

  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) {
    redirect(`${redirectTo}?error=unauthorized_profile`);
  }

  return { user, profile };
}

/**
 * Guard that ensures the user is a SUPER_ADMIN.
 * Redirects to /admin/dashboard with error query if unauthorized.
 */
export async function requireSuperAdmin(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  profile: Profile;
}> {
  const { user, profile } = await requireAuth();

  if (!isSuperAdmin(profile)) {
    redirect('/admin/dashboard?error=forbidden_super_admin_required');
  }

  return { user, profile };
}

/**
 * Guard that ensures the user is authorized for a specific department.
 */
export async function requireDepartmentAdmin(targetDepartmentId?: string): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  profile: Profile;
}> {
  const { user, profile } = await requireAuth();

  if (profile.role === 'SUPER_ADMIN') {
    return { user, profile };
  }

  if (profile.role !== 'DEPARTMENT_ADMIN') {
    redirect('/admin/dashboard?error=forbidden');
  }

  if (targetDepartmentId && profile.department_id !== targetDepartmentId) {
    redirect('/admin/dashboard?error=department_mismatch');
  }

  return { user, profile };
}
