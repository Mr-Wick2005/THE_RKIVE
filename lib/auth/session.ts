import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Profile } from '@/types/auth';

/**
 * Retrieves the current authenticated user from Supabase Auth on the server.
 * If an access_token is provided, it validates the JWT securely with Supabase.
 */
export async function getCurrentUser(token?: string | null) {
  try {
    if (token) {
      const supabaseAdmin = createAdminClient();
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        return null;
      }
      return user;
    }

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
export async function getCurrentProfile(token?: string | null): Promise<Profile | null> {
  try {
    const user = await getCurrentUser(token);
    if (!user) return null;

    const supabaseAdmin = createAdminClient();
    const { data: profile, error } = await supabaseAdmin
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
