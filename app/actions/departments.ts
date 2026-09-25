'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/utils';
import { ActionResult } from './magazines';
import { Department } from '@/types/department';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Super Admin only: Creates a new academic department
 */
export async function createDepartmentAction(
  formData: FormData
): Promise<ActionResult & { department?: Department }> {
  try {
    const token = formData.get('access_token') as string | null;
    const caller = await getCurrentProfile(token);
    if (!caller || caller.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Only College Super Administrators can add academic departments.',
      };
    }

    const name = (formData.get('name') as string)?.trim();
    const shortName = (formData.get('short_name') as string)?.trim().toUpperCase();
    const description = (formData.get('description') as string)?.trim() || null;

    if (!name || name.length < 2) {
      return { success: false, error: 'Department name is required (minimum 2 characters).' };
    }

    if (!shortName || shortName.length < 1) {
      return { success: false, error: 'Department abbreviation/short name is required.' };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase database is not configured.' };
    }

    const supabase = createAdminClient();

    // Check for duplicate names or abbreviations
    const { data: existingName } = await supabase
      .from('departments')
      .select('id, name, short_name')
      .ilike('name', name)
      .maybeSingle();

    if (existingName) {
      return { success: false, error: `A department with the name "${name}" already exists.` };
    }

    const { data: existingShort } = await supabase
      .from('departments')
      .select('id, name, short_name')
      .ilike('short_name', shortName)
      .maybeSingle();

    if (existingShort) {
      return { success: false, error: `A department with the abbreviation "${shortName}" already exists.` };
    }

    let slug = generateSlug(name);
    if (!slug) slug = generateSlug(shortName);

    // Verify slug uniqueness
    const { data: existingSlug } = await supabase
      .from('departments')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('departments')
      .insert({
        name,
        short_name: shortName,
        slug,
        description,
        is_active: true,
      })
      .select('*')
      .single();

    if (insertError || !inserted) {
      return {
        success: false,
        error: insertError?.message || 'Failed to create academic department.',
      };
    }

    revalidatePath('/');
    revalidatePath('/magazines');
    revalidatePath('/admin/departments');
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/users');

    return { success: true, department: inserted };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create department.' };
  }
}

/**
 * Super Admin only: Updates an existing academic department
 */
export async function updateDepartmentAction(
  formData: FormData
): Promise<ActionResult & { department?: Department }> {
  try {
    const token = formData.get('access_token') as string | null;
    const caller = await getCurrentProfile(token);
    if (!caller || caller.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Only College Super Administrators can update academic departments.',
      };
    }

    const id = (formData.get('id') as string)?.trim();
    const name = (formData.get('name') as string)?.trim();
    const shortName = (formData.get('short_name') as string)?.trim().toUpperCase();
    const description = (formData.get('description') as string)?.trim() || null;
    const isActiveVal = formData.get('is_active');
    const isActive = isActiveVal !== null ? isActiveVal === 'true' || isActiveVal === 'on' : true;

    if (!id) {
      return { success: false, error: 'Department ID is required.' };
    }

    if (!name || name.length < 2) {
      return { success: false, error: 'Department name is required (minimum 2 characters).' };
    }

    if (!shortName || shortName.length < 1) {
      return { success: false, error: 'Department abbreviation is required.' };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase database is not configured.' };
    }

    const supabase = createAdminClient();

    // Verify existing department
    const { data: currentDept, error: findError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !currentDept) {
      return { success: false, error: 'Department not found.' };
    }

    // Check for duplicate names (excluding self)
    const { data: existingName } = await supabase
      .from('departments')
      .select('id')
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle();

    if (existingName) {
      return { success: false, error: `Another department is already using the name "${name}".` };
    }

    // Check for duplicate short names (excluding self)
    const { data: existingShort } = await supabase
      .from('departments')
      .select('id')
      .ilike('short_name', shortName)
      .neq('id', id)
      .maybeSingle();

    if (existingShort) {
      return { success: false, error: `Another department is already using the abbreviation "${shortName}".` };
    }

    // If name changed, generate updated slug
    let slug = currentDept.slug;
    if (name !== currentDept.name) {
      const newSlug = generateSlug(name);
      const { data: existingSlug } = await supabase
        .from('departments')
        .select('id')
        .eq('slug', newSlug)
        .neq('id', id)
        .maybeSingle();

      if (!existingSlug) {
        slug = newSlug;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('departments')
      .update({
        name,
        short_name: shortName,
        slug,
        description,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      return {
        success: false,
        error: updateError?.message || 'Failed to update academic department.',
      };
    }

    revalidatePath('/');
    revalidatePath('/magazines');
    revalidatePath(`/department/${slug}`);
    revalidatePath(`/department/${currentDept.slug}`);
    revalidatePath('/admin/departments');
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/users');

    return { success: true, department: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update department.' };
  }
}

/**
 * Super Admin only: Safely deletes a department after verifying no linked magazines or active staff
 */
export async function deleteDepartmentAction(
  departmentId: string,
  token?: string
): Promise<ActionResult> {
  try {
    const caller = await getCurrentProfile(token);
    if (!caller || caller.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Only College Super Administrators can delete academic departments.',
      };
    }

    if (!departmentId) {
      return { success: false, error: 'Department ID is required.' };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase database is not configured.' };
    }

    const supabase = createAdminClient();

    // 1. Check if department exists
    const { data: dept, error: deptError } = await supabase
      .from('departments')
      .select('id, name, slug')
      .eq('id', departmentId)
      .single();

    if (deptError || !dept) {
      return { success: false, error: 'Department not found.' };
    }

    // 2. SAFETY CHECK: Check for associated magazines
    const { count: magCount, error: magCountError } = await supabase
      .from('magazines')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', departmentId);

    if (magCountError) {
      return { success: false, error: 'Failed to verify magazine relationships.' };
    }

    if (magCount && magCount > 0) {
      return {
        success: false,
        error: `Cannot delete "${dept.name}": There are ${magCount} magazine publication(s) linked to this department. Reassign or delete those publications first to prevent broken archive relationships.`,
      };
    }

    // 3. SAFETY CHECK: Check for associated users/profiles
    const { count: userCount, error: userCountError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', departmentId);

    if (userCountError) {
      return { success: false, error: 'Failed to verify user profile relationships.' };
    }

    if (userCount && userCount > 0) {
      return {
        success: false,
        error: `Cannot delete "${dept.name}": There are ${userCount} editorial user(s) assigned to this department. Reassign those staff members first in Editorial Staff management.`,
      };
    }

    // 4. Safe deletion
    const { error: deleteError } = await supabase
      .from('departments')
      .delete()
      .eq('id', departmentId);

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message || 'Failed to delete academic department.',
      };
    }

    revalidatePath('/');
    revalidatePath('/magazines');
    revalidatePath('/admin/departments');
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/users');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete department.' };
  }
}
