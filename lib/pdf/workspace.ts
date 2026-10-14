import fs from 'fs';
import path from 'path';
import os from 'os';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AcquiredPdf {
  localPath: string;
  sizeBytes: number;
  downloaded: boolean;
  fromCache: boolean;
}

/**
 * Returns the resolved managed temporary workspace directory for source PDFs
 */
export function getPdfWorkspaceDir(): string {
  if (process.env.PDF_CACHE_DIR && process.env.PDF_CACHE_DIR.trim().length > 0) {
    const customDir = path.resolve(process.env.PDF_CACHE_DIR.trim());
    if (!fs.existsSync(customDir)) {
      fs.mkdirSync(customDir, { recursive: true });
    }
    return customDir;
  }

  // Primary: scratch/pdf-cache in workspace if writable
  const localScratch = path.resolve(process.cwd(), 'scratch', 'pdf-cache');
  try {
    if (!fs.existsSync(localScratch)) {
      fs.mkdirSync(localScratch, { recursive: true });
    }
    return localScratch;
  } catch {
    // Fallback: OS temporary directory (useful in locked/container environments)
    const osTemp = path.join(os.tmpdir(), 'rkive-pdf-cache');
    if (!fs.existsSync(osTemp)) {
      fs.mkdirSync(osTemp, { recursive: true });
    }
    return osTemp;
  }
}

/**
 * Validates whether a file on disk has the required PDF header bytes
 */
function isValidLocalPdf(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (stat.size < 100) return false;

    const fd = fs.openSync(filePath, 'r');
    const headerBuf = Buffer.alloc(5);
    fs.readSync(fd, headerBuf, 0, 5, 0);
    fs.closeSync(fd);

    return headerBuf.toString('ascii').startsWith('%PDF-');
  } catch {
    return false;
  }
}

/**
 * Acquires the source PDF document into the managed local workspace.
 *
 * Performance guarantee:
 * If the file was already downloaded during a previous chunk or attempt on this
 * host/container, it reuses the local file with ZERO Supabase bandwidth consumption.
 */
export async function acquireSourcePdf(
  supabase: SupabaseClient<any, any, any>,
  magazineId: string,
  storagePath: string,
  fallbackUrl?: string | null
): Promise<AcquiredPdf> {
  const workspaceDir = getPdfWorkspaceDir();
  const localPath = path.join(workspaceDir, `${magazineId}.pdf`);
  const tempPath = path.join(workspaceDir, `${magazineId}.${Date.now()}.tmp`);

  // 1. Check if valid cached copy already exists in local workspace
  if (isValidLocalPdf(localPath)) {
    const stat = fs.statSync(localPath);
    console.log(
      `[PDF_WORKSPACE] CACHE_HIT publication_id=${magazineId} path=${localPath} size_bytes=${stat.size}`
    );
    return {
      localPath,
      sizeBytes: stat.size,
      downloaded: false,
      fromCache: true,
    };
  }

  console.log(
    `[PDF_WORKSPACE] CACHE_MISS publication_id=${magazineId} -> Downloading from storage path=${storagePath}`
  );

  // 2. Download from Supabase Storage
  let downloadedBuffer: Buffer | null = null;
  const { data: downloadedBlob, error: downloadError } = await supabase.storage
    .from('magazine-pdfs')
    .download(storagePath);

  if (downloadedBlob) {
    const arrayBuf = await downloadedBlob.arrayBuffer();
    downloadedBuffer = Buffer.from(arrayBuf);
  } else {
    // Fallback 1: Direct signed URL
    try {
      const { data: signedData } = await supabase.storage
        .from('magazine-pdfs')
        .createSignedUrl(storagePath, 180);

      if (signedData?.signedUrl) {
        const res = await fetch(signedData.signedUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          downloadedBuffer = Buffer.from(arrayBuf);
        }
      }
    } catch (signErr) {
      console.warn(`[PDF_WORKSPACE] Signed URL fallback note:`, signErr);
    }

    // Fallback 2: Stored public/direct URL
    if (!downloadedBuffer && fallbackUrl && (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://'))) {
      try {
        const res = await fetch(fallbackUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          downloadedBuffer = Buffer.from(arrayBuf);
        }
      } catch (urlErr) {
        console.warn(`[PDF_WORKSPACE] Direct URL fetch note:`, urlErr);
      }
    }
  }

  if (!downloadedBuffer || downloadedBuffer.length === 0) {
    throw new Error(
      `Failed to download PDF source from storage bucket: ${downloadError?.message || 'File not found or empty'}`
    );
  }

  // 3. Atomically write to temp file then rename
  fs.writeFileSync(tempPath, downloadedBuffer);
  fs.renameSync(tempPath, localPath);

  const finalStat = fs.statSync(localPath);
  console.log(
    `[PDF_WORKSPACE] DOWNLOADED_AND_CACHED publication_id=${magazineId} size_bytes=${finalStat.size} path=${localPath}`
  );

  return {
    localPath,
    sizeBytes: finalStat.size,
    downloaded: true,
    fromCache: false,
  };
}

/**
 * Safely removes a publication's source PDF from the local workspace
 * when processing is complete or permanently failed.
 */
export function releaseSourcePdf(magazineId: string): boolean {
  try {
    const workspaceDir = getPdfWorkspaceDir();
    const localPath = path.join(workspaceDir, `${magazineId}.pdf`);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`[PDF_WORKSPACE] RELEASED publication_id=${magazineId} path=${localPath}`);
      return true;
    }
  } catch (err) {
    console.warn(`[PDF_WORKSPACE] Non-critical release warning for ${magazineId}:`, err);
  }
  return false;
}

/**
 * Housekeeping: removes stale temporary files older than the specified max age (default: 24h)
 */
export function cleanupStaleWorkspace(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  let cleanedCount = 0;
  try {
    const workspaceDir = getPdfWorkspaceDir();
    if (!fs.existsSync(workspaceDir)) return 0;

    const files = fs.readdirSync(workspaceDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(workspaceDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[PDF_WORKSPACE] Housekeeping warning:', err);
  }
  return cleanedCount;
}
