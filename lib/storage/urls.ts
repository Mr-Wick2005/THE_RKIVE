/**
 * ==============================================================================
 * THE ARCHIVE — UNIFIED STORAGE URL RESOLVER
 * ==============================================================================
 * Safely resolves asset URLs across:
 * 1. Legacy full Supabase Storage URLs (from database records).
 * 2. Cloudflare R2 public URLs (when NEXT_PUBLIC_R2_PUBLIC_URL is configured).
 * 3. Relative bucket keys (e.g., 'magazine-covers/dept/mag/cover.jpg').
 * 4. Relative object subpaths (e.g., 'dept/mag/cover.jpg' with bucket option).
 * 5. Local static assets (e.g., '/placeholder-cover.jpg').
 *
 * Guarantees:
 * - Zero breaking changes for existing database records.
 * - Private assets (like magazine-pdfs) are never exposed via public R2 URLs.
 * - Explicit notification if falling back to Supabase.
 * ==============================================================================
 */

export const KNOWN_PUBLIC_BUCKETS = ['magazine-covers', 'magazine-pages', 'cms-assets'] as const;
export const RESTRICTED_BUCKETS = ['magazine-pdfs'] as const;

export type PublicBucket = (typeof KNOWN_PUBLIC_BUCKETS)[number];
export type StorageBucket = PublicBucket | (typeof RESTRICTED_BUCKETS)[number] | string;

export interface StorageUrlOptions {
  /**
   * Expected bucket name if the input is a relative path without a bucket prefix.
   */
  bucket?: StorageBucket;
  /**
   * Fallback URL if the path/url is null, undefined, or empty.
   */
  fallback?: string;
  /**
   * Force using Supabase URL even if R2 is configured (useful for rollback/debugging).
   */
  forceSupabase?: boolean;
}

export interface ParsedStorageReference {
  bucket: string | null;
  subpath: string;
  isFullSupabaseUrl: boolean;
  isFullR2Url: boolean;
  isLocalAsset: boolean;
  isExternalUrl: boolean;
  isRestricted: boolean;
}

let hasWarnedAboutMissingR2 = false;

/**
 * Returns the configured Cloudflare R2 public base URL (stripped of trailing slash),
 * or null if not yet configured.
 */
export function getR2PublicBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  if (!url || url.length === 0) {
    return null;
  }
  // Defensive auto-normalization: If the S3 API endpoint was configured instead of the public CDN domain,
  // route to the verified public bucket CDN URL.
  if (url.includes('.r2.cloudflarestorage.com')) {
    return 'https://pub-bfa4d9882894424eb07a99c4f913fd46.r2.dev';
  }
  return url.replace(/\/+$/, '');
}

/**
 * Returns true if Cloudflare R2 public serving is configured and active.
 */
export function isR2PublicConfigured(): boolean {
  return getR2PublicBaseUrl() !== null;
}

/**
 * Parses any storage reference (full URL or relative path) into structured parts.
 */
export function parseStorageReference(
  urlOrPath: string | null | undefined,
  defaultBucket?: StorageBucket
): ParsedStorageReference {
  if (!urlOrPath || typeof urlOrPath !== 'string' || urlOrPath.trim().length === 0) {
    return {
      bucket: null,
      subpath: '',
      isFullSupabaseUrl: false,
      isFullR2Url: false,
      isLocalAsset: false,
      isExternalUrl: false,
      isRestricted: false,
    };
  }

  const trimmed = urlOrPath.trim();

  // 1. Local assets (e.g., '/placeholder-cover.jpg')
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return {
      bucket: null,
      subpath: trimmed,
      isFullSupabaseUrl: false,
      isFullR2Url: false,
      isLocalAsset: true,
      isExternalUrl: false,
      isRestricted: false,
    };
  }

  const r2Base = getR2PublicBaseUrl();

  // 2. Already a full Cloudflare R2 public URL
  if (r2Base && trimmed.startsWith(r2Base)) {
    const relativePart = trimmed.slice(r2Base.length).replace(/^\/+/, '');
    const firstSlash = relativePart.indexOf('/');
    const bucket = firstSlash > 0 ? relativePart.slice(0, firstSlash) : relativePart;
    const subpath = firstSlash > 0 ? relativePart.slice(firstSlash + 1) : '';
    const isRestricted = RESTRICTED_BUCKETS.includes(bucket as any);

    return {
      bucket,
      subpath,
      isFullSupabaseUrl: false,
      isFullR2Url: true,
      isLocalAsset: false,
      isExternalUrl: false,
      isRestricted,
    };
  }

  // 3. Full Supabase Storage URL
  // Matches e.g. https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<subpath>
  // or https://<ref>.storage.supabase.co/v1/s3/<bucket>/<subpath>
  const supabaseStorageRegex =
    /(?:https?:\/\/[^/]+)?(?:\/storage\/v1\/object\/(?:public|authenticated|sign)|\/storage\/v1\/s3|\/v1\/s3)?\/(magazine-covers|magazine-pages|magazine-pdfs|cms-assets)\/(.+)$/i;

  const supaMatch = trimmed.match(supabaseStorageRegex);
  if (supaMatch) {
    const bucket = supaMatch[1];
    const subpathWithQuery = supaMatch[2];
    // Strip query parameters for object identification, but keep them if needed
    const subpath = decodeURIComponent(subpathWithQuery.split('?')[0]);
    const isRestricted = RESTRICTED_BUCKETS.includes(bucket as any);

    return {
      bucket,
      subpath,
      isFullSupabaseUrl: trimmed.startsWith('http://') || trimmed.startsWith('https://'),
      isFullR2Url: false,
      isLocalAsset: false,
      isExternalUrl: false,
      isRestricted,
    };
  }

  // 4. Relative path starting with known bucket name (e.g. 'magazine-covers/dept/mag/cover.jpg')
  const allKnownBuckets = [...KNOWN_PUBLIC_BUCKETS, ...RESTRICTED_BUCKETS];
  for (const b of allKnownBuckets) {
    if (trimmed.startsWith(`${b}/`)) {
      return {
        bucket: b,
        subpath: trimmed.slice(b.length + 1),
        isFullSupabaseUrl: false,
        isFullR2Url: false,
        isLocalAsset: false,
        isExternalUrl: false,
        isRestricted: RESTRICTED_BUCKETS.includes(b as any),
      };
    }
  }

  // 5. External third-party URL (e.g. 'https://images.unsplash.com/...')
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      bucket: null,
      subpath: trimmed,
      isFullSupabaseUrl: false,
      isFullR2Url: false,
      isLocalAsset: false,
      isExternalUrl: true,
      isRestricted: false,
    };
  }

  // 6. Relative subpath without bucket prefix (e.g. 'dept/mag/cover.jpg')
  const bucket = defaultBucket || null;
  const isRestricted = bucket ? RESTRICTED_BUCKETS.includes(bucket as any) : false;

  return {
    bucket,
    subpath: trimmed,
    isFullSupabaseUrl: false,
    isFullR2Url: false,
    isLocalAsset: false,
    isExternalUrl: false,
    isRestricted,
  };
}

/**
 * Converts any storage reference (legacy Supabase URL, relative path, or R2 key)
 * into a publicly accessible URL, routing to Cloudflare R2 when configured.
 *
 * Falls back to Supabase with an explicit diagnostic notice if R2 is not yet configured.
 */
export function getStorageAssetUrl(
  pathOrUrl: string | null | undefined,
  options: StorageUrlOptions = {}
): string {
  const fallback = options.fallback || '';
  if (!pathOrUrl || typeof pathOrUrl !== 'string' || pathOrUrl.trim().length === 0) {
    return fallback;
  }

  const parsed = parseStorageReference(pathOrUrl, options.bucket);

  // Local static files and external third-party URLs pass through untouched
  if (parsed.isLocalAsset || parsed.isExternalUrl) {
    return parsed.subpath || pathOrUrl;
  }

  // Restricted assets (original PDFs) MUST NEVER be mapped to public URLs
  if (parsed.isRestricted || parsed.bucket === 'magazine-pdfs') {
    return pathOrUrl;
  }

  const r2Base = getR2PublicBaseUrl();

  // ROUTE TO CLOUDFLARE R2
  if (r2Base && !options.forceSupabase && parsed.bucket) {
    // R2 structure: <bucket_name>/<subpath>
    const cleanSubpath = parsed.subpath.replace(/^\/+/, '');
    return `${r2Base}/${parsed.bucket}/${cleanSubpath}`;
  }

  // EXPLICIT SUPABASE FALLBACK
  // Log diagnostic notice if R2 is not configured so developers are aware
  if (!r2Base && !hasWarnedAboutMissingR2) {
    hasWarnedAboutMissingR2 = true;
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        '[Storage URLs] NEXT_PUBLIC_R2_PUBLIC_URL is not set. Serving assets from Supabase Storage fallback.'
      );
    }
  }

  // If already a full Supabase URL, return as-is
  if (parsed.isFullSupabaseUrl) {
    return pathOrUrl;
  }

  // If relative path and Supabase URL is available, construct Supabase public URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && parsed.bucket) {
    const cleanSubpath = parsed.subpath.replace(/^\/+/, '');
    return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${parsed.bucket}/${cleanSubpath}`;
  }

  return pathOrUrl;
}

/**
 * Convenience helper for magazine cover images.
 */
export function getCoverUrl(
  pathOrUrl: string | null | undefined,
  fallback = '/placeholder-cover.jpg'
): string {
  return getStorageAssetUrl(pathOrUrl, { bucket: 'magazine-covers', fallback });
}

/**
 * Convenience helper for full-resolution magazine page images.
 */
export function getPageImageUrl(pathOrUrl: string | null | undefined): string {
  return getStorageAssetUrl(pathOrUrl, { bucket: 'magazine-pages' });
}

/**
 * Convenience helper for magazine page thumbnails.
 */
export function getPageThumbnailUrl(pathOrUrl: string | null | undefined): string {
  return getStorageAssetUrl(pathOrUrl, { bucket: 'magazine-pages' });
}

/**
 * Convenience helper for landing page / CMS media assets.
 */
export function getCmsAssetUrl(pathOrUrl: string | null | undefined): string {
  return getStorageAssetUrl(pathOrUrl, { bucket: 'cms-assets' });
}
