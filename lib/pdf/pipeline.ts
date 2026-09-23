import { createAdminClient } from '@/lib/supabase/admin';
import { validatePdfBuffer } from './validator';
import { renderPdfPages, RenderedPage } from './renderer';
import { MagazineProcessingStatus } from '@/types/magazine';

export interface ProcessMagazineResult {
  success: boolean;
  pageCount?: number;
  error?: string;
}

/**
 * Extracts storage path from a full Supabase storage URL or returns relative path
 */
function extractStoragePath(urlOrPath: string, bucketName: string): string {
  if (!urlOrPath) return '';
  if (urlOrPath.includes(`/${bucketName}/`)) {
    const parts = urlOrPath.split(`/${bucketName}/`);
    return decodeURIComponent(parts[1].split('?')[0]);
  }
  return urlOrPath;
}

/**
 * Executes the complete server-side PDF ingestion and page-processing pipeline for a magazine.
 * 
 * Pipeline Steps:
 * 1. Retrieve magazine metadata & verify PDF existence
 * 2. Update processing_status to 'PROCESSING'
 * 3. Download original PDF from 'magazine-pdfs' bucket
 * 4. Validate PDF structure, magic bytes, size, and extract page count
 * 5. Render pages to high-resolution WebP (150-200 DPI equivalent) and thumbnails (320px)
 * 6. Clean up any existing page assets for this magazine
 * 7. Upload new page images & thumbnails to 'magazine-pages' bucket
 * 8. Insert/Upsert page records into 'magazine_pages' table
 * 9. Update magazine record with page_count and mark processing_status = 'COMPLETED'
 */
export async function processMagazinePdf(
  magazineId: string,
  options: {
    requestingUserId?: string;
  } = {}
): Promise<ProcessMagazineResult> {
  const supabase = createAdminClient();
  const startTime = Date.now();

  console.log(`[PDF Pipeline] Starting processing job for magazine ID: ${magazineId}`);

  try {
    // 1. Fetch magazine record
    const { data: magazine, error: fetchError } = await (supabase
      .from('magazines') as any)
      .select('id, department_id, slug, title, original_pdf_url, status, created_by')
      .eq('id', magazineId)
      .single();

    if (fetchError || !magazine) {
      const errorMsg = `Magazine not found: ${fetchError?.message || 'Record does not exist'}`;
      console.error(`[PDF Pipeline] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    // 2. Authorization check if requestingUserId is provided
    if (options.requestingUserId) {
      const { data: userProfile } = await (supabase
        .from('profiles') as any)
        .select('role, department_id')
        .eq('id', options.requestingUserId)
        .single();

      if (userProfile && userProfile.role !== 'SUPER_ADMIN') {
        if (userProfile.department_id !== magazine.department_id) {
          const errorMsg = 'Department access violation: You cannot process publications of another department.';
          console.error(`[PDF Pipeline] Authorization failed for user ${options.requestingUserId}: ${errorMsg}`);
          return { success: false, error: errorMsg };
        }
      }
    }

    if (!magazine.original_pdf_url) {
      const errorMsg = 'No original PDF file is associated with this magazine.';
      await updateMagazineStatus(supabase, magazineId, 'FAILED', errorMsg);
      return { success: false, error: errorMsg };
    }

    // 3. Mark magazine as PROCESSING
    await (supabase.from('magazines') as any)
      .update({
        processing_status: 'PROCESSING' as MagazineProcessingStatus,
        processing_started_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq('id', magazineId);

    console.log(`[PDF Pipeline] Downloading PDF for magazine: ${magazine.title} (${magazine.slug})`);

    // 4. Download PDF Buffer from Storage
    const storagePath = extractStoragePath(magazine.original_pdf_url, 'magazine-pdfs');
    let pdfBuffer: Buffer;

    const { data: downloadedBlob, error: downloadError } = await supabase.storage
      .from('magazine-pdfs')
      .download(storagePath);

    if (downloadError || !downloadedBlob) {
      // Fallback: Attempt fetch if original_pdf_url is a public/authenticated HTTP URL
      if (magazine.original_pdf_url.startsWith('http://') || magazine.original_pdf_url.startsWith('https://')) {
        const res = await fetch(magazine.original_pdf_url);
        if (!res.ok) {
          throw new Error(`Failed to download PDF from storage: ${res.statusText}`);
        }
        const arrayBuf = await res.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuf);
      } else {
        throw new Error(`Failed to download PDF from storage bucket: ${downloadError?.message || 'File not found'}`);
      }
    } else {
      const arrayBuf = await downloadedBlob.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuf);
    }

    console.log(`[PDF Pipeline] PDF downloaded successfully. Size: ${(pdfBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

    // 5. Validate PDF
    const validation = await validatePdfBuffer(pdfBuffer);
    if (!validation.isValid) {
      const errorMsg = validation.error || 'PDF validation failed.';
      console.error(`[PDF Pipeline] Validation error: ${errorMsg}`);
      await updateMagazineStatus(supabase, magazineId, 'FAILED', errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log(`[PDF Pipeline] PDF validated. Detected ${validation.pageCount} pages.`);

    // 6. Render pages to WebP & thumbnails
    console.log(`[PDF Pipeline] Rendering ${validation.pageCount} pages to optimized WebP...`);
    const { totalPages, pages } = await renderPdfPages(pdfBuffer, {
      scale: 3.0, // Print-quality ~216 DPI for crisp text on high-DPI displays
      pageQuality: 92,
      thumbnailWidth: 360,
      thumbnailQuality: 85,
      onProgress: (cur, total) => {
        if (cur % 10 === 0 || cur === total) {
          console.log(`[PDF Pipeline] Rendered page ${cur} of ${total}`);
        }
      },
    });

    // 7. Clean up existing page assets in storage bucket
    const departmentId = magazine.department_id;
    const folderPrefix = `${departmentId}/${magazineId}`;
    try {
      const { data: existingFiles } = await supabase.storage
        .from('magazine-pages')
        .list(`${folderPrefix}/pages`);
      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('magazine-pages')
          .remove(existingFiles.map((f) => `${folderPrefix}/pages/${f.name}`));
      }

      const { data: existingThumbs } = await supabase.storage
        .from('magazine-pages')
        .list(`${folderPrefix}/thumbnails`);
      if (existingThumbs && existingThumbs.length > 0) {
        await supabase.storage
          .from('magazine-pages')
          .remove(existingThumbs.map((f) => `${folderPrefix}/thumbnails/${f.name}`));
      }
    } catch (cleanupErr) {
      console.warn('[PDF Pipeline] Non-blocking storage cleanup notice:', cleanupErr);
    }

    // 8. Delete existing magazine_pages rows from database
    await (supabase.from('magazine_pages') as any)
      .delete()
      .eq('magazine_id', magazineId);

    // 9. Upload rendered pages and thumbnails in controlled parallel batches
    const BATCH_SIZE = 5;
    const pageRecordsToInsert: Array<{
      magazine_id: string;
      page_number: number;
      image_path: string;
      thumbnail_path: string;
      width: number;
      height: number;
      file_size: number;
      mime_type: string;
      render_version: number;
    }> = [];

    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
      const batch = pages.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (page: RenderedPage) => {
          const pagePadded = String(page.pageNumber).padStart(4, '0');
          const imageStoragePath = `${folderPrefix}/pages/page-${pagePadded}.webp`;
          const thumbStoragePath = `${folderPrefix}/thumbnails/page-${pagePadded}.webp`;

          // Upload full page WebP
          const { error: imgUploadErr } = await supabase.storage
            .from('magazine-pages')
            .upload(imageStoragePath, page.imageBuffer, {
              contentType: 'image/webp',
              upsert: true,
            });

          if (imgUploadErr) {
            throw new Error(`Failed to upload page ${page.pageNumber}: ${imgUploadErr.message}`);
          }

          // Upload thumbnail WebP
          const { error: thumbUploadErr } = await supabase.storage
            .from('magazine-pages')
            .upload(thumbStoragePath, page.thumbnailBuffer, {
              contentType: 'image/webp',
              upsert: true,
            });

          if (thumbUploadErr) {
            throw new Error(`Failed to upload thumbnail ${page.pageNumber}: ${thumbUploadErr.message}`);
          }

          // Get public URLs
          const { data: imgUrlData } = supabase.storage
            .from('magazine-pages')
            .getPublicUrl(imageStoragePath);

          const { data: thumbUrlData } = supabase.storage
            .from('magazine-pages')
            .getPublicUrl(thumbStoragePath);

          pageRecordsToInsert.push({
            magazine_id: magazineId,
            page_number: page.pageNumber,
            image_path: imgUrlData.publicUrl,
            thumbnail_path: thumbUrlData.publicUrl,
            width: page.width,
            height: page.height,
            file_size: page.fileSize,
            mime_type: page.mimeType,
            render_version: 1,
          });
        })
      );
    }

    // 10. Insert magazine_pages records
    // Sort by page number before inserting
    pageRecordsToInsert.sort((a, b) => a.page_number - b.page_number);

    const { error: insertPagesError } = await (supabase
      .from('magazine_pages') as any)
      .insert(pageRecordsToInsert);

    if (insertPagesError) {
      throw new Error(`Failed to insert magazine page records: ${insertPagesError.message}`);
    }

    // 11. Finalize magazine record
    const completedAt = new Date().toISOString();
    const { error: updateMagError } = await (supabase
      .from('magazines') as any)
      .update({
        processing_status: 'COMPLETED' as MagazineProcessingStatus,
        page_count: totalPages,
        processing_completed_at: completedAt,
        processed_at: completedAt,
        processing_error: null,
      })
      .eq('id', magazineId);

    if (updateMagError) {
      throw new Error(`Failed to finalize magazine processing state: ${updateMagError.message}`);
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[PDF Pipeline] Successfully processed ${totalPages} pages for magazine ${magazineId} in ${durationSeconds}s`
    );

    return {
      success: true,
      pageCount: totalPages,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected processing error occurred';
    console.error(`[PDF Pipeline] Processing failed for magazine ${magazineId}:`, errorMsg);
    await updateMagazineStatus(supabase, magazineId, 'FAILED', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Helper to update magazine processing status
 */
async function updateMagazineStatus(
  supabase: ReturnType<typeof createAdminClient>,
  magazineId: string,
  status: MagazineProcessingStatus,
  errorMessage: string | null = null
) {
  try {
    await (supabase.from('magazines') as any)
      .update({
        processing_status: status,
        processing_error: errorMessage,
        processing_completed_at: status === 'COMPLETED' || status === 'FAILED' ? new Date().toISOString() : null,
      })
      .eq('id', magazineId);
  } catch (updateErr) {
    console.error('[PDF Pipeline] Failed to update magazine processing status:', updateErr);
  }
}
