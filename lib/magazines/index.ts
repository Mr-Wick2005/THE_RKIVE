import { createClient } from '@/lib/supabase/server';
import { MagazineWithRelations } from '@/types/magazine';
import { isSupabaseConfigured, withTimeout } from '@/lib/utils';
import { FALLBACK_DEPARTMENTS } from '@/lib/departments';

export interface MagazineFilterOptions {
  departmentSlug?: string;
  academicYear?: string;
  query?: string;
  sort?: 'latest' | 'oldest' | 'title_asc';
  limit?: number;
}

// Curated realistic demo publications for development and preview
export const FALLBACK_MAGAZINES: MagazineWithRelations[] = [
  {
    id: 'm0000000-0000-0000-0000-000000000001',
    slug: 'technova-2026-vol-14',
    department_id: 'a0000000-0000-0000-0000-000000000001',
    title: 'TechNova: Frontiers of Computing',
    subtitle: 'Annual Department Research & Tech Journal',
    description:
      'Showcasing student capstones, high-throughput distributed systems research, consensus protocols, and faculty insights on decentralized systems architecture.',
    academic_year: '2025-2026',
    edition: 'Annual Research Edition',
    volume: 'Vol. 14',
    issue: 'Issue 1',
    cover_image_url: null,
    original_pdf_url: null,
    page_count: 56,
    status: 'PUBLISHED',
    processing_status: 'COMPLETED',
    processing_error: null,
    rejection_reason: null,
    processing_started_at: '2026-02-10T08:50:00Z',
    processing_completed_at: '2026-02-10T08:55:00Z',
    processed_at: '2026-02-10T08:55:00Z',
    created_by: 'u0000000-0000-0000-0000-000000000001',
    published_at: '2026-02-15T09:00:00Z',
    created_at: '2026-02-10T09:00:00Z',
    updated_at: '2026-02-15T09:00:00Z',
    department: FALLBACK_DEPARTMENTS[0],
  },
  {
    id: 'm0000000-0000-0000-0000-000000000002',
    slug: 'neural-horizons-2026',
    department_id: 'a0000000-0000-0000-0000-000000000003',
    title: 'Neural Horizons: Intelligence in Action',
    subtitle: 'Artificial Intelligence & Machine Learning Digest',
    description:
      'Explorations in autonomous navigation, multimodal foundational models, reinforcement learning in robotic dexterity, and ethical AI stewardship in higher education.',
    academic_year: '2025-2026',
    edition: 'Inaugural Issue',
    volume: 'Vol. 03',
    issue: 'Issue 2',
    cover_image_url: null,
    original_pdf_url: null,
    page_count: 48,
    status: 'PUBLISHED',
    processing_status: 'COMPLETED',
    processing_error: null,
    rejection_reason: null,
    processing_started_at: '2026-01-15T10:25:00Z',
    processing_completed_at: '2026-01-15T10:30:00Z',
    processed_at: '2026-01-15T10:30:00Z',
    created_by: 'u0000000-0000-0000-0000-000000000001',
    published_at: '2026-01-20T10:30:00Z',
    created_at: '2026-01-15T10:30:00Z',
    updated_at: '2026-01-20T10:30:00Z',
    department: FALLBACK_DEPARTMENTS[2],
  },
  {
    id: 'm0000000-0000-0000-0000-000000000003',
    slug: 'signal-spectrum-2026',
    department_id: 'a0000000-0000-0000-0000-000000000004',
    title: 'Signal & Spectrum: Next-Gen Telecom',
    subtitle: 'Electronics & Telecommunication Periodical',
    description:
      'Investigation into 6G millimeter-wave propagation, energy-harvesting IoT sensors, neuromorphic silicon architectures, and satellite constellation communications.',
    academic_year: '2025-2026',
    edition: 'Spring Symposium Issue',
    volume: 'Vol. 09',
    issue: 'Issue 1',
    cover_image_url: null,
    original_pdf_url: null,
    page_count: 42,
    status: 'PUBLISHED',
    processing_status: 'COMPLETED',
    processing_error: null,
    rejection_reason: null,
    processing_started_at: '2025-11-28T13:55:00Z',
    processing_completed_at: '2025-11-28T14:00:00Z',
    processed_at: '2025-11-28T14:00:00Z',
    created_by: 'u0000000-0000-0000-0000-000000000001',
    published_at: '2025-12-05T14:00:00Z',
    created_at: '2025-11-28T14:00:00Z',
    updated_at: '2025-12-05T14:00:00Z',
    department: FALLBACK_DEPARTMENTS[3],
  },
  {
    id: 'm0000000-0000-0000-0000-000000000004',
    slug: 'bytecode-chronicle-2025',
    department_id: 'a0000000-0000-0000-0000-000000000002',
    title: 'ByteCode: Secure Cloud Architecture',
    subtitle: 'Information Technology Annual Review',
    description:
      'Zero-trust security postures, quantum-resistant cryptography, high-performance edge computing infrastructure, and big data pipeline optimization.',
    academic_year: '2025-2026',
    edition: 'Autumn Issue',
    volume: 'Vol. 11',
    issue: 'Issue 2',
    cover_image_url: null,
    original_pdf_url: null,
    page_count: 52,
    status: 'PUBLISHED',
    processing_status: 'COMPLETED',
    processing_error: null,
    rejection_reason: null,
    processing_started_at: '2025-11-01T10:55:00Z',
    processing_completed_at: '2025-11-01T11:00:00Z',
    processed_at: '2025-11-01T11:00:00Z',
    created_by: 'u0000000-0000-0000-0000-000000000001',
    published_at: '2025-11-10T11:00:00Z',
    created_at: '2025-11-01T11:00:00Z',
    updated_at: '2025-11-10T11:00:00Z',
    department: FALLBACK_DEPARTMENTS[1],
  },
  {
    id: 'm0000000-0000-0000-0000-000000000005',
    slug: 'kinematics-energy-2025',
    department_id: 'a0000000-0000-0000-0000-000000000005',
    title: 'Kinematics & Clean Mobility Systems',
    subtitle: 'Mechanical Engineering Annual Review',
    description:
      'Advanced additive manufacturing with titanium alloys, battery thermal runaway mitigation in EV powertrains, and biomimetic underwater robotics.',
    academic_year: '2024-2025',
    edition: 'Annual Capstone Edition',
    volume: 'Vol. 18',
    issue: 'Issue 1',
    cover_image_url: null,
    original_pdf_url: null,
    page_count: 64,
    status: 'PUBLISHED',
    processing_status: 'COMPLETED',
    processing_error: null,
    rejection_reason: null,
    processing_started_at: '2025-05-01T09:55:00Z',
    processing_completed_at: '2025-05-01T10:00:00Z',
    processed_at: '2025-05-01T10:00:00Z',
    created_by: 'u0000000-0000-0000-0000-000000000001',
    published_at: '2025-05-18T10:00:00Z',
    created_at: '2025-05-01T10:00:00Z',
    updated_at: '2025-05-18T10:00:00Z',
    department: FALLBACK_DEPARTMENTS[4],
  },
  {
    id: 'm0000000-0000-0000-0000-000000000006',
    slug: 'urban-horizons-2025',
    department_id: 'a0000000-0000-0000-0000-000000000006',
    title: 'Urban Horizons: Sustainable Infrastructure',
    subtitle: 'Civil Engineering & Smart Cities Review',
    description:
      'Geopolymer concrete applications in coastal defense, seismic retrofitting methodologies, satellite hydrology modeling, and intelligent urban transport grids.',
    academic_year: '2024-2025',
    edition: 'Special Symposium Issue',
    volume: 'Vol. 07',
    issue: 'Issue 1',
    cover_image_url: null,
    original_pdf_url: null,
    page_count: 50,
    status: 'PUBLISHED',
    processing_status: 'COMPLETED',
    processing_error: null,
    rejection_reason: null,
    processing_started_at: '2025-04-01T08:25:00Z',
    processing_completed_at: '2025-04-01T08:30:00Z',
    processed_at: '2025-04-01T08:30:00Z',
    created_by: 'u0000000-0000-0000-0000-000000000001',
    published_at: '2025-04-12T08:30:00Z',
    created_at: '2025-04-01T08:30:00Z',
    updated_at: '2025-04-12T08:30:00Z',
    department: FALLBACK_DEPARTMENTS[5],
  },
];

/**
 * Helper to filter fallback demo magazines
 */
export function getFilteredFallbackMagazines(
  options: MagazineFilterOptions = {}
): MagazineWithRelations[] {
  const { departmentSlug, academicYear, query, sort = 'latest', limit } = options;
  let results = [...FALLBACK_MAGAZINES];

  if (departmentSlug) {
    results = results.filter((m) => m.department?.slug === departmentSlug);
  }

  if (academicYear) {
    results = results.filter((m) => m.academic_year === academicYear);
  }

  if (query) {
    const q = query.toLowerCase().trim();
    results = results.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.subtitle && m.subtitle.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.department?.name && m.department.name.toLowerCase().includes(q)) ||
        (m.department?.short_name && m.department.short_name.toLowerCase().includes(q))
    );
  }

  if (sort === 'latest') {
    results.sort(
      (a, b) =>
        new Date(b.published_at || b.created_at).getTime() -
        new Date(a.published_at || a.created_at).getTime()
    );
  } else if (sort === 'oldest') {
    results.sort(
      (a, b) =>
        new Date(a.published_at || a.created_at).getTime() -
        new Date(b.published_at || b.created_at).getTime()
    );
  } else if (sort === 'title_asc') {
    results.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (limit && limit > 0) {
    results = results.slice(0, limit);
  }

  return results;
}

/**
 * Fetches all PUBLISHED magazines with flexible query filtering and sorting
 */
export async function getPublishedMagazines(
  options: MagazineFilterOptions = {}
): Promise<MagazineWithRelations[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  return withTimeout(
    (async () => {
      try {
        const { departmentSlug, academicYear, query, sort = 'latest', limit } = options;
        const supabase = createClient();
        let queryBuilder = supabase
          .from('magazines')
          .select('*, department:departments(*)')
          .eq('status', 'PUBLISHED');

        if (academicYear) {
          queryBuilder = queryBuilder.eq('academic_year', academicYear);
        }

        if (query) {
          queryBuilder = queryBuilder.or(
            `title.ilike.%${query}%,subtitle.ilike.%${query}%,description.ilike.%${query}%`
          );
        }

        if (sort === 'latest') {
          queryBuilder = queryBuilder.order('published_at', { ascending: false });
        } else if (sort === 'oldest') {
          queryBuilder = queryBuilder.order('published_at', { ascending: true });
        } else if (sort === 'title_asc') {
          queryBuilder = queryBuilder.order('title', { ascending: true });
        }

        if (limit) {
          queryBuilder = queryBuilder.limit(limit);
        }

        const { data, error } = await queryBuilder;

        if (error || !data) {
          if (error) console.error('Error in getPublishedMagazines:', error.message);
          return [];
        }

        let results = data as MagazineWithRelations[];

        if (departmentSlug) {
          results = results.filter((m) => m.department?.slug === departmentSlug);
        }

        return results;
      } catch (err) {
        console.error('Error in getPublishedMagazines:', err);
        return [];
      }
    })(),
    2500,
    []
  );
}

/**
 * Fetches featured publications for the hero & bookshelf
 */
export async function getFeaturedMagazines(limit = 4): Promise<MagazineWithRelations[]> {
  return getPublishedMagazines({ sort: 'latest', limit });
}

/**
 * Fetches a single published magazine by slug with relations
 */
export async function getPublishedMagazineBySlug(
  slug: string
): Promise<MagazineWithRelations | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return withTimeout(
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('magazines')
          .select('*, department:departments(*)')
          .eq('slug', slug)
          .eq('status', 'PUBLISHED')
          .single();

        if (error || !data) {
          return null;
        }

        return data as MagazineWithRelations;
      } catch (err) {
        console.error('Error in getPublishedMagazineBySlug:', err);
        return null;
      }
    })(),
    2500,
    null
  );
}

/**
 * Fetches a single magazine by slug regardless of publication status (for admin preview)
 */
export async function getMagazineBySlug(
  slug: string
): Promise<MagazineWithRelations | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return withTimeout(
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('magazines')
          .select('*, department:departments(*)')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          return null;
        }

        return data as MagazineWithRelations;
      } catch (err) {
        console.error('Error in getMagazineBySlug:', err);
        return null;
      }
    })(),
    2500,
    null
  );
}

/**
 * Fetches published magazines for a specific department
 */
export async function getPublishedMagazinesByDepartment(
  departmentId: string,
  sort: 'latest' | 'oldest' | 'title_asc' = 'latest'
): Promise<MagazineWithRelations[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  return withTimeout(
    (async () => {
      try {
        const supabase = createClient();
        let queryBuilder = supabase
          .from('magazines')
          .select('*, department:departments(*)')
          .eq('department_id', departmentId)
          .eq('status', 'PUBLISHED');

        if (sort === 'latest') {
          queryBuilder = queryBuilder.order('published_at', { ascending: false });
        } else if (sort === 'oldest') {
          queryBuilder = queryBuilder.order('published_at', { ascending: true });
        } else if (sort === 'title_asc') {
          queryBuilder = queryBuilder.order('title', { ascending: true });
        }

        const { data, error } = await queryBuilder;

        if (error || !data) {
          return [];
        }

        return data as MagazineWithRelations[];
      } catch (err) {
        console.error('Error in getPublishedMagazinesByDepartment:', err);
        return [];
      }
    })(),
    2500,
    []
  );
}

/**
 * Fetches all distinct academic years from published magazines
 */
export async function getAcademicYears(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  return withTimeout(
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('magazines')
          .select('academic_year')
          .eq('status', 'PUBLISHED');

        if (error || !data || data.length === 0) {
          return [];
        }

        const years = Array.from(
          new Set((data as unknown as Array<{ academic_year: string }>).map((d) => d.academic_year))
        );
        return years.sort().reverse();
      } catch (err) {
        console.error('Error in getAcademicYears:', err);
        return [];
      }
    })(),
    2500,
    []
  );
}
