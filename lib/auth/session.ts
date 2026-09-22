import { createClient } from '@/lib/supabase/server';
import { Profile } from '@/types/auth';

/**
 * Retrieves the current authenticated user from Supabase Auth on the server.
 */
export async function getCurrentUser() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.error('Error fetching current user:', err);
    return null;
  }
}

/**
 * Retrieves the profile record corresponding to the current authenticated user,
 * including their assigned role and department.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = createClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !profile) {
      console.warn('No active profile found for authenticated user:', user.id);
      return null;
    }

    return profile;
  } catch (err) {
    console.error('Error fetching current profile:', err);
    return null;
  }
}
