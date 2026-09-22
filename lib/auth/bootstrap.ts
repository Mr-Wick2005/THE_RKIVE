import { createAdminClient } from '@/lib/supabase/admin';
import { ProfileWithDepartment } from '@/types/auth';
import { isSupabaseConfigured, withTimeout } from '@/lib/utils';

/**
 * Checks if the platform has no SUPER_ADMIN provisioned yet.
 * Returns true ONLY if 0 Super Admins exist in public.profiles.
 * Once at least one Super Admin exists, returns false permanently.
 */
export async function isSuperAdminBootstrapAvailable(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  return withTimeout(
    (async () => {
      try {
        const supabase = createAdminClient();
        const { data, count, error } = await (supabase.from('profiles') as any)
          .select('id', { count: 'exact', head: false })
          .eq('role', 'SUPER_ADMIN')
          .limit(1);

        if (error) {
          // If table doesn't exist yet or query fails, allow setup flow to guide user
          console.warn('Bootstrap check query error:', error.message);
          return true;
        }

        const superAdminCount = count ?? (data ? data.length : 0);
        return superAdminCount === 0;
      } catch (err) {
        console.error('Error in isSuperAdminBootstrapAvailable:', err);
        return false;
      }
    })(),
    2500,
    false
  );
}

/**
 * Super Admin only: Fetches all editorial users with department relation
 */
export async function getEditorialUsers(): Promise<ProfileWithDepartment[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  return withTimeout(
    (async () => {
      try {
        const supabase = createAdminClient();
        const { data, error } = await (supabase.from('profiles') as any)
          .select('*, department:departments(*)')
          .order('created_at', { ascending: false });

        if (error || !data) {
          console.error('Error fetching editorial users:', error?.message);
          return [];
        }

        return data as ProfileWithDepartment[];
      } catch (err) {
        console.error('Error in getEditorialUsers:', err);
        return [];
      }
    })(),
    2500,
    []
  );
}

/**
 * Super Admin only: Summary statistics of editorial users
 */
export async function getEditorialUserStats() {
  const users = await getEditorialUsers();

  return {
    total: users.length,
    superAdmins: users.filter((u) => u.role === 'SUPER_ADMIN').length,
    departmentAdmins: users.filter((u) => u.role === 'DEPARTMENT_ADMIN').length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
  };
}
