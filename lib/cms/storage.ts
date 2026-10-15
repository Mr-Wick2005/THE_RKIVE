import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageAssetUrl, getCmsAssetUrl } from '@/lib/storage/urls';
import { isR2ServerConfigured, uploadToR2 } from '@/lib/storage/r2';

export const MAX_CMS_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_CMS_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_CMS_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
];

export interface CmsUploadResult {
  filePath: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Validates and uploads a landing page image or video asset to Supabase Storage ('cms-assets').
 */
export async function uploadCmsAsset(
  file: File | Blob | any,
  sectionTag: string = 'general'
): Promise<CmsUploadResult> {
  const fileName = (file as any).name || `asset-${Date.now()}.png`;
  const mimeType = (file as any).type || 'image/jpeg';
  const fileSize = (file as any).size || 0;

  const isVideo = mimeType.startsWith('video/') || fileName.endsWith('.mp4');
  const maxLimit = isVideo ? MAX_CMS_VIDEO_SIZE : MAX_CMS_IMAGE_SIZE;

  if (fileSize > maxLimit) {
    const limitMb = (maxLimit / (1024 * 1024)).toFixed(0);
    throw new Error(`File exceeds the ${limitMb} MB limit.`);
  }

  const isAllowed =
    ALLOWED_CMS_MIME_TYPES.includes(mimeType) ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png') ||
    fileName.endsWith('.webp') ||
    fileName.endsWith('.svg') ||
    fileName.endsWith('.mp4');

  if (!isAllowed) {
    throw new Error('Unsupported file format. Please upload JPG, PNG, WEBP, SVG, or MP4.');
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'png');
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const filePath = `${sectionTag}/${timestamp}_${safeName}`;

  // In Node.js server environments, converting to Buffer
  const isNode = typeof window === 'undefined';
  let payload: any = file;
  if (isNode && typeof (file as any).arrayBuffer === 'function') {
    const arrayBuffer = await file.arrayBuffer();
    payload = Buffer.from(arrayBuffer);
  }

  // 1. Upload to Cloudflare R2 Public Bucket if configured
  if (isR2ServerConfigured()) {
    try {
      const r2Key = `cms-assets/${filePath}`;
      await uploadToR2({
        scope: 'public',
        key: r2Key,
        body: payload,
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000, immutable',
      });
      const resolvedPublicUrl = getCmsAssetUrl(r2Key);
      return {
        filePath,
        publicUrl: resolvedPublicUrl,
        fileName,
        fileSize,
        mimeType,
      };
    } catch (r2Err) {
      console.warn('[CMS Storage] R2 upload note, falling back to Supabase:', r2Err);
    }
  }

  const supabase = createAdminClient();

  // Try uploading to 'cms-assets', fall back to 'magazine-covers' if cms-assets is not yet created
  let bucketName = 'cms-assets';
  let { error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, payload, {
      upsert: true,
      contentType: mimeType,
    });

  if (error && error.message?.toLowerCase().includes('bucket not found')) {
    bucketName = 'magazine-covers';
    const fallbackPath = `cms/${filePath}`;
    const res = await supabase.storage
      .from(bucketName)
      .upload(fallbackPath, payload, {
        upsert: true,
        contentType: mimeType,
      });
    error = res.error;
  }

  if (error) {
    console.error('[CMS Storage] Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const resolvedPublicUrl = getStorageAssetUrl(filePath, { bucket: bucketName });

  return {
    filePath,
    publicUrl: resolvedPublicUrl,
    fileName,
    fileSize,
    mimeType,
  };
}
