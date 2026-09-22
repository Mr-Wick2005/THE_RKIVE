import { createClient } from '@/lib/supabase/server';
import { Department, DepartmentWithStats } from '@/types/department';
import { isSupabaseConfigured, withTimeout } from '@/lib/utils';

// Standard college academic departments
export const FALLBACK_DEPARTMENTS: Department[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Computer Engineering',
    short_name: 'COMP',
    slug: 'computer-engineering',
    description: 'Innovations in distributed systems, software architecture, algorithms, and computing paradigms.',
    logo_url: null,
    cover_image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Information Technology',
    short_name: 'IT',
    slug: 'information-technology',
    description: 'Cybersecurity, cloud infrastructure, enterprise computing, and distributed data systems.',
    logo_url: null,
    cover_image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    name: 'Artificial Intelligence & Machine Learning',
    short_name: 'AIML',
    slug: 'artificial-intelligence-machine-learning',
    description: 'Frontiers in neural computation, deep learning, cognitive robotics, and ethical AI stewardship.',
    logo_url: null,
    cover_image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    name: 'Electronics & Telecommunication',
    short_name: 'EXTC',
    slug: 'electronics-telecommunication',
    description: 'VLSI architectures, signal processing, embedded systems, photonics, and RF communications.',
    logo_url: null,
    cover_image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    name: 'Mechanical Engineering',
    short_name: 'MECH',
    slug: 'mechanical-engineering',
    description: 'Thermodynamics, autonomous robotics, precision manufacturing, and clean mobility technologies.',
    logo_url: null,
    cover_image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    name: 'Civil Engineering',
    short_name: 'CIVIL',
    slug: 'civil-engineering',
    description: 'Resilient structures, smart city infrastructure, geotechnics, and environmental sustainability.',
    logo_url: null,
    cover_image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * Fetches all active departments from Supabase with fallback support
 */
export async function getActiveDepartments(): Promise<Department[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  return (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error || !data) {
          if (error) console.error('Error in getActiveDepartments:', error.message);
          return [];
        }

        return data;
      } catch (err) {
        console.error('Error in getActiveDepartments:', err);
        return [];
      }
    })();
}

/**
 * Fetches departments along with their count of published magazines
 */
export async function getDepartmentsWithStats(): Promise<DepartmentWithStats[]> {
  const departments = await getActiveDepartments();

  if (departments.length === 0) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    return departments.map((d) => ({
      ...d,
      magazine_count: 0,
      latest_magazine_year: undefined,
    }));
  }

  return withTimeout(
    (async () => {
      try {
        const supabase = createClient();
        const { data: magazines, error } = await supabase
          .from('magazines')
          .select('department_id, academic_year')
          .eq('status', 'PUBLISHED');

        if (error || !magazines || magazines.length === 0) {
          return departments.map((d) => ({
            ...d,
            magazine_count: 0,
            latest_magazine_year: undefined,
          }));
        }

        const countMap: Record<string, number> = {};
        const yearMap: Record<string, string> = {};

        (magazines as unknown as Array<{ department_id: string; academic_year: string }>).forEach((m) => {
          countMap[m.department_id] = (countMap[m.department_id] || 0) + 1;
          if (!yearMap[m.department_id] || m.academic_year > yearMap[m.department_id]) {
            yearMap[m.department_id] = m.academic_year;
          }
        });

        return departments.map((d) => ({
          ...d,
          magazine_count: countMap[d.id] || 0,
          latest_magazine_year: yearMap[d.id] || undefined,
        }));
      } catch (err) {
        console.error('Error in getDepartmentsWithStats:', err);
        return departments.map((d) => ({
          ...d,
          magazine_count: 0,
          latest_magazine_year: undefined,
        }));
      }
    })(),
    2500,
    departments.map((d) => ({
      ...d,
      magazine_count: 0,
      latest_magazine_year: undefined,
    }))
  );
}

/**
 * Fetches a single department by its unique slug
 */
export async function getDepartmentBySlug(slug: string): Promise<Department | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return withTimeout(
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          return null;
        }

        return data;
      } catch (err) {
        console.error('Error in getDepartmentBySlug:', err);
        return null;
      }
    })(),
    2500,
    null
  );
}

/**
 * Fetches a single department by its UUID
 */
export async function getDepartmentById(id: string): Promise<Department | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in getDepartmentById:', err);
    return null;
  }
}
