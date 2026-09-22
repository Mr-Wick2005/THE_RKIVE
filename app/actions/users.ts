'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/utils';
import { ActionResult } from './magazines';

/**
 * Server action to bootstrap the very first Super Admin.
 * Permanently disabled once any SUPER_ADMIN exists in the institutional database.
 */
export async function bootstrapFirstSuperAdminAction(
  _formData: FormData
): Promise<ActionResult & { email?: string }> {
  return {
    success: false,
    error: 'Super Admin setup is permanently unavailable. Use the existing authorized account.',
  };
}

/**
 * Super Admin only: Creates and provisions a new Department Admin
 */
export async function createDepartmentAdminAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const caller = await getCurrentProfile();
    if (!caller || caller.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Only College Super Administrators can provision Department Admins.',
      };
    }

    const fullName = (formData.get('full_name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = (formData.get('password') as string)?.trim();
    const departmentId = (formData.get('department_id') as string)?.trim();

    if (!fullName) {
      return { success: false, error: 'Full name is required.' };
    }

    if (!email || !email.includes('@')) {
      return { success: false, error: 'A valid email address is required.' };
    }

    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    if (!departmentId) {
      return { success: false, error: 'A Department Admin must belong to exactly one academic department.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    // 1. Verify that the target department exists
    const { data: dept } = await (supabase.from('departments') as any)
      .select('id, name')
      .eq('id', departmentId)
      .single();

    if (!dept) {
      return { success: false, error: 'Selected department does not exist.' };
    }

    // 2. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: {
        role: 'DEPARTMENT_ADMIN',
        department_id: departmentId,
      },
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Failed to create authentication user in Supabase.',
      };
    }

    // The auth trigger is synchronous. Verify the secured profile before reporting
    // success so an Auth-only account is never presented as provisioned.
    const { data: profile, error: profileError } = await (supabase.from('profiles') as any)
      .select('id, role, department_id, is_active')
      .eq('id', authData.user.id)
      .single();
    if (
      profileError ||
      !profile ||
      profile.role !== 'DEPARTMENT_ADMIN' ||
      profile.department_id !== departmentId ||
      !profile.is_active
    ) {
      return { success: false, error: 'Authentication account was created, but its Department Admin profile was not provisioned correctly. Contact the system administrator.' };
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to provision department admin.' };
  }
}

/**
 * Super Admin only: Activate or deactivate an editorial user account
 */
export async function toggleUserStatusAction(
  userId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const caller = await getCurrentProfile();
    if (!caller || caller.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Super Admin privileges required.' };
    }

    if (caller.id === userId && !isActive) {
      return { success: false, error: 'Safety Guard: You cannot deactivate your own Super Admin account.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();
    const { error } = await (supabase.from('profiles') as any)
      .update({ is_active: isActive })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message || 'Failed to update account status.' };
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update user status.' };
  }
}

/**
 * Super Admin only: Reassign department for a Department Admin
 */
export async function updateUserDepartmentAction(
  userId: string,
  departmentId: string
): Promise<ActionResult> {
  try {
    const caller = await getCurrentProfile();
    if (!caller || caller.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Super Admin privileges required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();
    const { data: target, error: targetError } = await (supabase.from('profiles') as any)
      .select('role')
      .eq('id', userId)
      .single();
    if (targetError || !target) return { success: false, error: 'User profile was not found.' };
    if (target.role !== 'DEPARTMENT_ADMIN') {
      return { success: false, error: 'Only Department Admin accounts can be assigned to a department.' };
    }
    const { data: department, error: departmentError } = await (supabase.from('departments') as any)
      .select('id')
      .eq('id', departmentId)
      .eq('is_active', true)
      .single();
    if (departmentError || !department) return { success: false, error: 'Selected department does not exist or is inactive.' };
    const { error } = await (supabase.from('profiles') as any)
      .update({ department_id: departmentId })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message || 'Failed to reassign department.' };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update department assignment.' };
  }
}
