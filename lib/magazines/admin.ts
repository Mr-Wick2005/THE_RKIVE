import { createAdminClient } from '@/lib/supabase/admin';
import { MagazineWithRelations, MagazineStatus } from '@/types/magazine';
import { Profile } from '@/types/auth';
import { isSupabaseConfigured, slugify, withTimeout } from '@/lib/utils';

export { slugify };

export interface DepartmentStats {
  total: number;
  drafts: number;
  submitted: number;
  underReview: number;
  approved: number;
  published: number;
  rejected: number;
}

/**
 * Ensures slug uniqueness by appending suffix if needed
 */
export async function generateUniqueMagazineSlug(
  title: string,
  currentMagazineId?: string
): Promise<string> {
  const baseSlug = slugify(title) || 'magazine';

  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');

  return withTimeout(
    (async () => {
      try {
        const supabase = createAdminClient();
        let query = supabase.from('magazines').select('id, slug').like('slug', `${baseSlug}%`);

        if (currentMagazineId) {
          query = query.neq('id', currentMagazineId);
        }

        const { data } = await query;

        if (!data || data.length === 0) {
          return baseSlug;
        }

        const existingSlugs = new Set(
          (data as unknown as Array<{ id: string; slug: string }>).map((d) => d.slug)
        );
        if (!existingSlugs.has(baseSlug)) {
          return baseSlug;
        }

        let counter = 1;
        while (existingSlugs.has(`${baseSlug}-${counter}`)) {
          counter++;
        }

        return `${baseSlug}-${counter}`;
      } catch (err) {
        console.error('Error generating unique slug:', err);
        return `${baseSlug}-${Date.now().toString().slice(-4)}`;
      }
    })(),
    2500,
    `${baseSlug}-${Date.now().toString().slice(-4)}`
  );
}

/**
 * Fetches all magazines belonging to the authenticated department administrator
 * or all magazines if user is SUPER_ADMIN
 */
export async function getMyDepartmentMagazines(
  profile: Profile
): Promise<MagazineWithRelations[]> {
  if (!isSupabaseConfigured()) return [];

  return withTimeout(
    (async () => {
      try {
        const supabase = createAdminClient();
        let query = supabase
          .from('magazines')
          .select('*, department:departments(*)')
          .order('created_at', { ascending: false });

        // For Department Admin, restrict query to assigned department_id
        if (profile.role !== 'SUPER_ADMIN') {
          if (!profile.department_id) return [];
          query = query.eq('department_id', profile.department_id);
        }

        const { data, error } = await query;

        if (error || !data) {
          if (error) console.error('Error in getMyDepartmentMagazines:', error.message);
          return [];
        }

        return data as MagazineWithRelations[];
      } catch (err) {
        console.error('Error in getMyDepartmentMagazines:', err);
        return [];
      }
    })(),
    2500,
    []
  );
}

/**
 * Fetches a single magazine by ID with department isolation check
 */
export async function getMyDepartmentMagazineById(
  id: string,
  profile: Profile
): Promise<MagazineWithRelations | null> {
  if (!isSupabaseConfigured()) return null;

  return withTimeout(
    (async () => {
      try {
        const supabase = createAdminClient();
        let queryBuilder = supabase
          .from('magazines')
          .select('*, department:departments(*)')
          .eq('id', id);

        if (profile.role !== 'SUPER_ADMIN') {
          if (!profile.department_id) return null;
          queryBuilder = queryBuilder.eq('department_id', profile.department_id);
        }

        const { data, error } = await queryBuilder.single();

        if (error || !data) {
          return null;
        }

        return data as MagazineWithRelations;
      } catch (err) {
        console.error('Error in getMyDepartmentMagazineById:', err);
        return null;
      }
    })(),
    2500,
    null
  );
}

/**
 * Calculates summary metrics directly from a pre-fetched list of magazines
 */
export function calculateStatsFromMagazines(magazines: MagazineWithRelations[]): DepartmentStats {
  const stats: DepartmentStats = {
    total: magazines.length,
    drafts: 0,
    submitted: 0,
    underReview: 0,
    approved: 0,
    published: 0,
    rejected: 0,
  };

  magazines.forEach((m) => {
    switch (m.status) {
      case 'DRAFT':
        stats.drafts++;
        break;
      case 'SUBMITTED':
        stats.submitted++;
        break;
      case 'UNDER_REVIEW':
        stats.underReview++;
        break;
      case 'APPROVED':
        stats.approved++;
        break;
      case 'PUBLISHED':
        stats.published++;
        break;
      case 'REJECTED':
        stats.rejected++;
        break;
    }
  });

  return stats;
}

/**
 * Calculates summary metrics for the department workspace
 */
export async function getDepartmentPublicationStats(
  profile: Profile
): Promise<DepartmentStats> {
  const magazines = await getMyDepartmentMagazines(profile);
  return calculateStatsFromMagazines(magazines);
}

/**
 * Super Admin Review Queue queries with timeout protection
 */
export async function getReviewQueueMagazines(
  statusFilter?: MagazineStatus | 'ALL'
): Promise<MagazineWithRelations[]> {
  if (!isSupabaseConfigured()) return [];

  return withTimeout(
    (async () => {
      try {
        const supabase = createAdminClient();
        let query = supabase
          .from('magazines')
          .select('*, department:departments(*), author:profiles(*)')
          .order('updated_at', { ascending: false });

        if (statusFilter && statusFilter !== 'ALL') {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;
        if (error || !data) {
          if (error) console.error('Error in getReviewQueueMagazines:', error.message);
          return [];
        }

        return data as MagazineWithRelations[];
      } catch (err) {
        console.error('Error in getReviewQueueMagazines:', err);
        return [];
      }
    })(),
    2500,
    []
  );
}

/**
 * Fetches single publication for Super Admin Review with pages and audit trail
 */
export async function getMagazineForReview(
  id: string
): Promise<MagazineWithRelations | null> {
  if (!isSupabaseConfigured()) return null;

  return withTimeout(
    (async () => {
      try {
        const supabase = createAdminClient();
        const { data: magazine, error: magError } = await supabase
          .from('magazines')
          .select('*, department:departments(*), author:profiles(*)')
          .eq('id', id)
          .single();

        if (magError || !magazine) {
          return null;
        }

        // Fetch pages
        const { data: pages } = await supabase
          .from('magazine_pages')
          .select('*')
          .eq('magazine_id', id)
          .order('page_number', { ascending: true });

        // Fetch status history
        const { data: history } = await (supabase
          .from('magazine_status_history') as any)
          .select('*, profile:profiles(*)')
          .eq('magazine_id', id)
          .order('created_at', { ascending: false });

        return {
          ...(magazine as any),
          pages: pages || [],
          status_history: history || [],
        } as MagazineWithRelations;
      } catch (err) {
        console.error('Error in getMagazineForReview:', err);
        return null;
      }
    })(),
    2500,
    null
  );
}

/**
 * Audit log helper: Records a status transition in magazine_status_history
 */
export async function recordStatusTransition(
  magazineId: string,
  fromStatus: MagazineStatus | null,
  toStatus: MagazineStatus,
  changedBy: string | null,
  note?: string | null
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const supabase = createAdminClient();
  const { error } = await (supabase.from('magazine_status_history') as any).insert({
    magazine_id: magazineId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: changedBy,
    note: note || null,
  });
  if (error) throw new Error(`Failed to record status transition: ${error.message}`);
}
