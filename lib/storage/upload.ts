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
export function validateCoverFile(file: File): FileValidationResult {
  if (!ALLOWED_COVER_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Cover image must be a valid JPG, PNG, or WEBP file.',
    };
  }

  if (file.size > MAX_COVER_SIZE_BYTES) {
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
export function validatePdfFile(file: File): FileValidationResult {
  const isPdfMime = ALLOWED_PDF_MIME_TYPES.includes(file.type.toLowerCase());
  const isPdfExtension = file.name.toLowerCase().endsWith('.pdf');

  if (!isPdfMime && !isPdfExtension) {
    return {
      valid: false,
      error: 'Please upload a valid PDF document.',
    };
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
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
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'webp';
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
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const validation = validateCoverFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const filePath = getCoverStoragePath(departmentId, magazineId, file.name);

  const { data, error } = await supabase.storage
    .from('magazine-covers')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error('Error uploading cover to storage:', error);
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
  file: File
): Promise<{ path: string }> {
  const validation = validatePdfFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const filePath = getPdfStoragePath(departmentId, magazineId);

  const { data, error } = await supabase.storage
    .from('magazine-pdfs')
    .upload(filePath, file, {
      upsert: true,
      contentType: 'application/pdf',
    });

  if (error) {
    console.error('Error uploading PDF to storage:', error);
    throw new Error(`Failed to upload PDF file: ${error.message}`);
  }

  return { path: filePath };
}
