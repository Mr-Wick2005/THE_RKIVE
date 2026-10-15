import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { STORAGE_LIMITS } from '@/lib/config/upload-limits';
import { getCoverUrl } from './urls';
import { isR2ServerConfigured, uploadToR2, deletePrefixFromR2 } from './r2';

export {
  getStorageAssetUrl,
  getCoverUrl,
  getPageImageUrl,
  getPageThumbnailUrl,
  getCmsAssetUrl,
  getR2PublicBaseUrl,
  isR2PublicConfigured,
} from './urls';

export const MAX_COVER_SIZE_BYTES = STORAGE_LIMITS.MAX_COVER_SIZE_BYTES;
export const MAX_PDF_SIZE_BYTES = STORAGE_LIMITS.MAX_PDF_SIZE_BYTES;

export const ALLOWED_COVER_MIME_TYPES = [...STORAGE_LIMITS.ALLOWED_COVER_MIME_TYPES] as string[];
export const ALLOWED_PDF_MIME_TYPES = [...STORAGE_LIMITS.ALLOWED_PDF_MIME_TYPES] as string[];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a magazine cover image file
 */
export function validateCoverFile(file: File | { name?: string; type?: string; size?: number }): FileValidationResult {
  const fileName = file?.name?.toLowerCase() || '';
  const fileType = file?.type?.toLowerCase() || '';
  const isCoverMime = ALLOWED_COVER_MIME_TYPES.includes(fileType);
  const isCoverExt = STORAGE_LIMITS.ALLOWED_COVER_EXTENSIONS.some((ext) => fileName.endsWith(ext));

  if (!isCoverMime && !isCoverExt) {
    return {
      valid: false,
      error: 'Cover image must be a valid JPG, PNG, or WEBP file.',
    };
  }

  if (file.size && file.size > MAX_COVER_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const maxMb = (MAX_COVER_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Cover image size (${sizeMb} MB) exceeds the ${maxMb} MB limit.`,
    };
  }

  return { valid: true };
}

/**
 * Validates a magazine original PDF document
 */
export function validatePdfFile(file: File | { name?: string; type?: string; size?: number }): FileValidationResult {
  const fileName = file?.name?.toLowerCase() || '';
  const fileType = file?.type?.toLowerCase() || '';
  const isPdfMime = ALLOWED_PDF_MIME_TYPES.includes(fileType);
  const isPdfExtension = fileName.endsWith('.pdf');

  if (!isPdfMime && !isPdfExtension) {
    return {
      valid: false,
      error: 'Please upload a valid PDF document (.pdf file format).',
    };
  }

  if (file.size && file.size > MAX_PDF_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const maxMb = (MAX_PDF_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `PDF document size (${sizeMb} MB) exceeds the configured ${maxMb} MB platform limit. Please optimize the PDF or split it before uploading.`,
    };
  }

  return { valid: true };
}

/**
 * Builds structured department-scoped cover path:
 * magazine-covers/{department_id}/{magazine_id}/cover-{timestamp}.{ext}
 */
export function getCoverStoragePath(
  departmentId: string,
  magazineId: string,
  originalFilename: string
): string {
  const ext = originalFilename?.split('.').pop()?.toLowerCase() || 'webp';
  const timestamp = Date.now();
  return `${departmentId}/${magazineId}/cover-${timestamp}.${ext}`;
}

/**
 * Extracts relative storage path from a full Supabase storage URL or returns relative path
 */
export function extractStoragePath(urlOrPath: string, bucketName: string): string {
  if (!urlOrPath) return '';
  if (urlOrPath.includes(`/${bucketName}/`)) {
    const parts = urlOrPath.split(`/${bucketName}/`);
    return decodeURIComponent(parts[1].split('?')[0]);
  }
  if (urlOrPath.startsWith(`${bucketName}/`)) {
    return urlOrPath.substring(bucketName.length + 1);
  }
  return urlOrPath;
}

/**
 * Builds structured department-scoped PDF path:
 * magazine-pdfs/{department_id}/{magazine_id}/original-{timestamp}.pdf
 */
export function getPdfStoragePath(
  departmentId: string,
  magazineId: string
): string {
  const timestamp = Date.now();
  return `${departmentId}/${magazineId}/original-${timestamp}.pdf`;
}

/**
 * Uploads a cover file to the 'magazine-covers' bucket and returns public URL
 */
export async function uploadMagazineCover(
  supabase: SupabaseClient<any, any, any> | any,
  departmentId: string,
  magazineId: string,
  file: File | Blob | any
): Promise<{ path: string; publicUrl: string }> {
  const validation = validateCoverFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const fileName = (file as any).name || 'cover.jpg';
  const filePath = getCoverStoragePath(departmentId, magazineId, fileName);

  // In Node.js server environments, converting to ArrayBuffer/Buffer ensures seamless upload
  const isNode = typeof window === 'undefined';
  let uploadPayload: any = file;
  if (isNode && typeof (file as any).arrayBuffer === 'function') {
    const arrayBuffer = await file.arrayBuffer();
    uploadPayload = Buffer.from(arrayBuffer);
  }

  const contentType = (file as any).type || 'image/jpeg';

  if (isR2ServerConfigured()) {
    try {
      const r2Key = `magazine-covers/${filePath}`;
      await uploadToR2({
        scope: 'public',
        key: r2Key,
        body: uploadPayload,
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      });
      const publicUrl = getCoverUrl(r2Key);
      return { path: filePath, publicUrl };
    } catch (r2Err) {
      console.warn('[Storage] R2 cover upload note, falling back to Supabase:', r2Err);
    }
  }

  const { data, error } = await supabase.storage
    .from('magazine-covers')
    .upload(filePath, uploadPayload, {
      upsert: true,
      contentType,
    });

  if (error) {
    console.error('[Storage] Error uploading cover to magazine-covers:', error);
    throw new Error(`Failed to upload cover image: ${error.message}`);
  }

  const publicUrl = getCoverUrl(filePath);

  return { path: filePath, publicUrl };
}

/**
 * Uploads a PDF file to the restricted 'magazine-pdfs' bucket
 */
export async function uploadMagazinePdf(
  supabase: SupabaseClient<any, any, any> | any,
  departmentId: string,
  magazineId: string,
  file: File | Blob | any
): Promise<{ path: string }> {
  const validation = validatePdfFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const filePath = getPdfStoragePath(departmentId, magazineId);

  // In Node.js server environments, converting to ArrayBuffer/Buffer ensures seamless upload
  const isNode = typeof window === 'undefined';
  let uploadPayload: any = file;
  if (isNode && typeof (file as any).arrayBuffer === 'function') {
    const arrayBuffer = await file.arrayBuffer();
    uploadPayload = Buffer.from(arrayBuffer);
  }

  if (isR2ServerConfigured()) {
    try {
      const r2Key = `magazine-pdfs/${filePath}`;
      await uploadToR2({
        scope: 'private',
        key: r2Key,
        body: uploadPayload,
        contentType: 'application/pdf',
      });
      return { path: filePath };
    } catch (r2Err) {
      console.warn('[Storage] R2 PDF upload note, falling back to Supabase:', r2Err);
    }
  }

  const { data, error } = await supabase.storage
    .from('magazine-pdfs')
    .upload(filePath, uploadPayload, {
      upsert: true,
      contentType: 'application/pdf',
    });

  if (error) {
    console.error('[Storage] Error uploading PDF to magazine-pdfs:', error);
    throw new Error(`Failed to upload PDF file: ${error.message}`);
  }

  return { path: filePath };
}

/**
 * Safely removes all storage assets (cover, PDF, rendered pages, thumbnails)
 * associated with a magazine from Supabase storage buckets and Cloudflare R2.
 */
export async function deleteMagazineStorageAssets(
  supabase: SupabaseClient<any, any, any> | any,
  departmentId: string,
  magazineId: string
): Promise<void> {
  const folderPrefix = `${departmentId}/${magazineId}`;

  // 1. Clean up Cloudflare R2 (both public and private buckets)
  if (isR2ServerConfigured()) {
    try {
      await deletePrefixFromR2({ scope: 'public', prefix: `magazine-covers/${folderPrefix}` });
      await deletePrefixFromR2({ scope: 'public', prefix: `magazine-pages/${folderPrefix}` });
      await deletePrefixFromR2({ scope: 'private', prefix: `magazine-pdfs/${folderPrefix}` });
    } catch (r2Err) {
      console.warn('[Storage Cleanup] Non-critical R2 cleanup warning:', r2Err);
    }
  }

  // 2. Clean up magazine-covers in Supabase
  try {
    const { data: coverFiles } = await supabase.storage
      .from('magazine-covers')
      .list(folderPrefix);
    if (coverFiles && coverFiles.length > 0) {
      await supabase.storage
        .from('magazine-covers')
        .remove(coverFiles.map((f: { name: string }) => `${folderPrefix}/${f.name}`));
    }
  } catch (err) {
    console.warn('[Storage Cleanup] Non-critical cover cleanup warning:', err);
  }

  // 3. Clean up magazine-pdfs in Supabase
  try {
    const { data: pdfFiles } = await supabase.storage
      .from('magazine-pdfs')
      .list(folderPrefix);
    if (pdfFiles && pdfFiles.length > 0) {
      await supabase.storage
        .from('magazine-pdfs')
        .remove(pdfFiles.map((f: { name: string }) => `${folderPrefix}/${f.name}`));
    }
  } catch (err) {
    console.warn('[Storage Cleanup] Non-critical PDF cleanup warning:', err);
  }

  // 4. Clean up magazine-pages in Supabase (pages and thumbnails)
  try {
    const { data: pageFiles } = await supabase.storage
      .from('magazine-pages')
      .list(`${folderPrefix}/pages`);
    if (pageFiles && pageFiles.length > 0) {
      await supabase.storage
        .from('magazine-pages')
        .remove(pageFiles.map((f: { name: string }) => `${folderPrefix}/pages/${f.name}`));
    }

    const { data: thumbFiles } = await supabase.storage
      .from('magazine-pages')
      .list(`${folderPrefix}/thumbnails`);
    if (thumbFiles && thumbFiles.length > 0) {
      await supabase.storage
        .from('magazine-pages')
        .remove(thumbFiles.map((f: { name: string }) => `${folderPrefix}/thumbnails/${f.name}`));
    }
  } catch (err) {
    console.warn('[Storage Cleanup] Non-critical pages cleanup warning:', err);
  }
}
