import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export const MAX_COVER_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export const ALLOWED_COVER_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const ALLOWED_PDF_MIME_TYPES = ['application/pdf'];

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
  const isCoverExt = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp');

  if (!isCoverMime && !isCoverExt) {
    return {
      valid: false,
      error: 'Cover image must be a valid JPG, PNG, or WEBP file.',
    };
  }

  if (file.size && file.size > MAX_COVER_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Cover image size (${sizeMb} MB) exceeds the 10 MB limit.`,
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
  const isPdfMime = fileType === 'application/pdf' || fileType === 'application/x-pdf' || fileType === 'application/octet-stream';
  const isPdfExtension = fileName.endsWith('.pdf');

  if (!isPdfMime && !isPdfExtension) {
    return {
      valid: false,
      error: 'Please upload a valid PDF document (.pdf file format).',
    };
  }

  if (file.size && file.size > MAX_PDF_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `PDF document size (${sizeMb} MB) exceeds the allowed 100 MB limit.`,
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

  const {
    data: { publicUrl },
  } = supabase.storage.from('magazine-covers').getPublicUrl(filePath);

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
 * associated with a magazine from Supabase storage buckets.
 */
export async function deleteMagazineStorageAssets(
  supabase: SupabaseClient<any, any, any> | any,
  departmentId: string,
  magazineId: string
): Promise<void> {
  const folderPrefix = `${departmentId}/${magazineId}`;

  // 1. Clean up magazine-covers
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

  // 2. Clean up magazine-pdfs
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

  // 3. Clean up magazine-pages (pages and thumbnails)
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
