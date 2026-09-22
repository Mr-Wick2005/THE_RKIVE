import { createClient } from '@/lib/supabase/server';
import { MagazinePage, MagazineProcessingStatus } from '@/types/magazine';
import { isSupabaseConfigured, withTimeout } from '@/lib/utils';

/**
 * Retrieves all processed pages for a magazine ordered sequentially by page_number.
 * RLS ensures that public users only receive pages for PUBLISHED magazines,
 * and department admins only receive pages for their own department's magazines.
 */
export async function getMagazinePages(magazineId: string): Promise<MagazinePage[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  return withTimeout(
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await (supabase
          .from('magazine_pages') as any)
          .select('*')
          .eq('magazine_id', magazineId)
          .order('page_number', { ascending: true });

        if (error || !data) {
          return [];
        }

        return data as MagazinePage[];
      } catch (err) {
        console.error(`Error fetching pages for magazine ${magazineId}:`, err);
        return [];
      }
    })(),
    2500,
    []
  );
}

/**
 * Retrieves a single page for a magazine by page number (1-indexed).
 */
export async function getMagazinePage(
  magazineId: string,
  pageNumber: number
): Promise<MagazinePage | null> {
  const supabase = createClient();
  const { data, error } = await (supabase
    .from('magazine_pages') as any)
    .select('*')
    .eq('magazine_id', magazineId)
    .eq('page_number', pageNumber)
    .single();

  if (error || !data) {
    return null;
  }

  return data as MagazinePage;
}

/**
 * Retrieves the total processed page count for a magazine.
 */
export async function getMagazinePageCount(magazineId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await (supabase
    .from('magazine_pages') as any)
    .select('*', { count: 'exact', head: true })
    .eq('magazine_id', magazineId);

  if (error) {
    console.error(`Error counting pages for magazine ${magazineId}:`, error.message);
    return 0;
  }

  return count || 0;
}

/**
 * Retrieves current processing status and details for a magazine.
 */
export async function getProcessingStatus(magazineId: string): Promise<{
  processing_status: MagazineProcessingStatus;
  processing_error: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  processed_at: string | null;
  page_count: number;
} | null> {
  const supabase = createClient();
  const { data, error } = await (supabase
    .from('magazines') as any)
    .select(
      'processing_status, processing_error, processing_started_at, processing_completed_at, processed_at, page_count'
    )
    .eq('id', magazineId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as {
    processing_status: MagazineProcessingStatus;
    processing_error: string | null;
    processing_started_at: string | null;
    processing_completed_at: string | null;
    processed_at: string | null;
    page_count: number;
  };
}
