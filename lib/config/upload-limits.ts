/**
 * THE RKIVE — Centralized Ingestion, Storage & Processing Configuration
 *
 * Single source of truth for:
 * 1. Storage bucket constraints & payload limits
 * 2. MIME type whitelists & file extension guards
 * 3. Processing pipeline defaults (scale, quality, concurrency, batching)
 * 4. Queue lease and retry policies
 */

export const STORAGE_LIMITS = {
  // Max source PDF size (100 MB target)
  MAX_PDF_SIZE_BYTES: 100 * 1024 * 1024,
  // Minimum valid PDF size (bytes)
  MIN_PDF_SIZE_BYTES: 100,
  // Max cover art size (10 MB)
  MAX_COVER_SIZE_BYTES: 10 * 1024 * 1024,
  // Maximum safe page count to prevent unbounded memory allocation
  MAX_PDF_PAGE_COUNT: 300,
  // Allowed MIME types
  ALLOWED_PDF_MIME_TYPES: [
    'application/pdf',
    'application/x-pdf',
    'application/octet-stream',
  ] as const,
  ALLOWED_COVER_MIME_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ] as const,
  ALLOWED_COVER_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'] as const,
  ALLOWED_PDF_EXTENSIONS: ['.pdf'] as const,
};

export const PIPELINE_CONFIG = {
  // Rasterization scale: 2.0 produces ~160-180 DPI (crisp text, optimal size)
  DEFAULT_SCALE: 2.0,
  // High-resolution WebP compression quality (0-100)
  DEFAULT_PAGE_QUALITY: 86,
  // Sharp WebP effort (0-6)
  DEFAULT_PAGE_EFFORT: 3,
  // Max width for navigation thumbnails in pixels
  DEFAULT_THUMBNAIL_WIDTH: 360,
  // WebP compression quality for thumbnails
  DEFAULT_THUMBNAIL_QUALITY: 80,
  // Default batch size when running in serverless HTTP worker
  SERVERLESS_BATCH_SIZE: 4,
  // Default batch size when running in standalone container worker
  CONTAINER_BATCH_SIZE: 8,
  // Maximum concurrent page rendering tasks per worker instance
  MAX_CONCURRENT_PAGES: 2,
  // Cache header for immutable page assets (1 year)
  PAGE_CACHE_CONTROL: '31536000, immutable',
};

export const QUEUE_CONFIG = {
  // Heartbeat reporting frequency during active job execution
  HEARTBEAT_INTERVAL_MS: 15_000,
  // Lease timeout after which an un-heartbeated job is considered stale
  LEASE_TIMEOUT_MS: 120_000,
  // Maximum automatic retries for transient errors
  MAX_ATTEMPTS: 5,
  // Base delay for exponential backoff (ms)
  BASE_BACKOFF_MS: 1000,
  // Maximum delay cap for exponential backoff (ms)
  MAX_BACKOFF_MS: 60_000,
};

export type AllowedPdfMimeType = (typeof STORAGE_LIMITS.ALLOWED_PDF_MIME_TYPES)[number];
export type AllowedCoverMimeType = (typeof STORAGE_LIMITS.ALLOWED_COVER_MIME_TYPES)[number];
