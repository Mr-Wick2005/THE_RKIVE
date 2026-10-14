import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ReconciliationReport {
  magazineId: string;
  expectedPages: number;
  dbPagesCount: number;
  missingDbPages: number[];
  storagePagesCount: number;
  missingStoragePages: string[];
  orphanedStorageFiles: string[];
  isConsistent: boolean;
}

/**
 * Reconciles a publication's database records against its physical storage assets.
 * Detects missing page records, missing images, and orphaned objects.
 */
export async function reconcilePublicationAssets(
  magazineId: string,
  supabaseClient?: SupabaseClient
): Promise<ReconciliationReport> {
  const supabase = supabaseClient || createAdminClient();

  // 1. Fetch magazine metadata
  const { data: magazine, error: magErr } = await (supabase
    .from('magazines') as any)
    .select('id, department_id, page_count, processing_status')
    .eq('id', magazineId)
    .single();

  if (magErr || !magazine) {
    throw new Error(`Magazine ${magazineId} not found: ${magErr?.message || 'Invalid ID'}`);
  }

  const expectedPages = magazine.page_count || 0;
  const folderPrefix = `${magazine.department_id}/${magazine.id}`;

  // 2. Fetch database page rows
  const { data: dbPages, error: dbErr } = await (supabase
    .from('magazine_pages') as any)
    .select('page_number, image_path, thumbnail_path')
    .eq('magazine_id', magazineId)
    .order('page_number', { ascending: true });

  if (dbErr) {
    throw new Error(`Failed to query database pages: ${dbErr.message}`);
  }

  const dbPageNumbers = new Set<number>((dbPages || []).map((p: any) => p.page_number));
  const missingDbPages: number[] = [];
  for (let i = 1; i <= expectedPages; i++) {
    if (!dbPageNumbers.has(i)) {
      missingDbPages.push(i);
    }
  }

  // 3. List actual storage files in magazine-pages
  const { data: storageFiles } = await supabase.storage
    .from('magazine-pages')
    .list(`${folderPrefix}/pages`);

  const actualFileNames = new Set<string>((storageFiles || []).map((f) => f.name));
  const missingStoragePages: string[] = [];
  const expectedFileNames = new Set<string>();

  for (let i = 1; i <= expectedPages; i++) {
    const pageFileName = `page-${String(i).padStart(4, '0')}.webp`;
    expectedFileNames.add(pageFileName);
    if (!actualFileNames.has(pageFileName)) {
      missingStoragePages.push(pageFileName);
    }
  }

  // Orphaned storage files: files in bucket folder that don't correspond to any valid page 1..N
  const orphanedStorageFiles: string[] = [];
  actualFileNames.forEach((actualFile) => {
    if (!expectedFileNames.has(actualFile)) {
      orphanedStorageFiles.push(`${folderPrefix}/pages/${actualFile}`);
    }
  });

  const isConsistent =
    expectedPages > 0 &&
    missingDbPages.length === 0 &&
    missingStoragePages.length === 0 &&
    dbPages.length === expectedPages;

  return {
    magazineId,
    expectedPages,
    dbPagesCount: dbPages?.length || 0,
    missingDbPages,
    storagePagesCount: storageFiles?.length || 0,
    missingStoragePages,
    orphanedStorageFiles,
    isConsistent,
  };
}

/**
 * Purges orphaned storage files detected during reconciliation
 */
export async function purgeOrphanedStorageAssets(
  orphanedPaths: string[],
  supabaseClient?: SupabaseClient
): Promise<number> {
  if (!orphanedPaths || orphanedPaths.length === 0) return 0;
  const supabase = supabaseClient || createAdminClient();

  const { error } = await supabase.storage
    .from('magazine-pages')
    .remove(orphanedPaths);

  if (error) {
    console.error('[RECONCILIATION] Failed to remove orphaned objects:', error);
    return 0;
  }

  return orphanedPaths.length;
}
