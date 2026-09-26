import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { createCanvas, DOMMatrix, Path2D } from '@napi-rs/canvas';
import sharp from 'sharp';

// Read .env.local
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  }
} catch (e) {
  console.warn('Could not read .env.local');
}

if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = DOMMatrix;
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = Path2D;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('--- Testing PDF Pipeline Execution ---');
  
  const magazineId = '7a685967-b60a-48b7-912c-3fb6893f14a1';
  
  // 1. Fetch magazine
  const { data: magazine, error: magErr } = await supabase
    .from('magazines')
    .select('*')
    .eq('id', magazineId)
    .single();

  if (magErr || !magazine) {
    console.error('Magazine not found:', magErr);
    process.exit(1);
  }

  console.log(`[1] Found magazine: ${magazine.title}, PDF URL: ${magazine.original_pdf_url}`);

  // 2. Download PDF buffer
  const { data: downloadedBlob, error: downloadError } = await supabase.storage
    .from('magazine-pdfs')
    .download(magazine.original_pdf_url);

  if (downloadError || !downloadedBlob) {
    console.error('Download error:', downloadError);
    process.exit(1);
  }

  const arrayBuf = await downloadedBlob.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuf);
  console.log(`[2] Downloaded PDF: ${pdfBuffer.length} bytes`);

  // 3. Load PDF with pdfjs-dist
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
  const pdfjsLib = pdfjs.default || pdfjs;

  const rootDir = process.cwd();
  const cMapUrl = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'cmaps').replace(/\\/g, '/') + '/';
  const standardFontDataUrl = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'standard_fonts').replace(/\\/g, '/') + '/';

  class NapiCanvasFactory {
    create(width, height) {
      const canvas = createCanvas(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
      const context = canvas.getContext('2d');
      return { canvas, context };
    }
    reset(canvasAndContext, width, height) {
      if (canvasAndContext.canvas) {
        canvasAndContext.canvas.width = Math.max(1, Math.floor(width));
        canvasAndContext.canvas.height = Math.max(1, Math.floor(height));
      }
    }
    destroy(canvasAndContext) {
      if (canvasAndContext.canvas) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
      }
    }
    _createCanvas(width, height) {
      return createCanvas(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
    }
  }

  const canvasFactory = new NapiCanvasFactory();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
    canvasFactory: canvasFactory,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  console.log(`[3] PDF loaded successfully! Total pages: ${totalPages}`);

  const departmentId = magazine.department_id;
  const folderPrefix = `${departmentId}/${magazineId}`;
  const pageRecordsToInsert = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    console.log(`[4] Rendering page ${pageNum}...`);
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvasWidth = Math.floor(viewport.width);
    const canvasHeight = Math.floor(viewport.height);

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
      canvasFactory: canvasFactory,
    }).promise;

    const rawPngBuffer = canvas.toBuffer('image/png');

    const optimizedWebpBuffer = await sharp(rawPngBuffer)
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    const thumbnailWebpBuffer = await sharp(rawPngBuffer)
      .resize({ width: 360, withoutEnlargement: true })
      .webp({ quality: 80, effort: 3 })
      .toBuffer();

    const pagePadded = String(pageNum).padStart(4, '0');
    const imageStoragePath = `${folderPrefix}/pages/page-${pagePadded}.webp`;
    const thumbStoragePath = `${folderPrefix}/thumbnails/page-${pagePadded}.webp`;

    console.log(`[5] Uploading page ${pageNum} WebP to magazine-pages...`);
    const { error: pageUploadErr } = await supabase.storage
      .from('magazine-pages')
      .upload(imageStoragePath, optimizedWebpBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (pageUploadErr) {
      console.error(`Page upload error:`, pageUploadErr);
      process.exit(1);
    }

    const { error: thumbUploadErr } = await supabase.storage
      .from('magazine-pages')
      .upload(thumbStoragePath, thumbnailWebpBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (thumbUploadErr) {
      console.error(`Thumb upload error:`, thumbUploadErr);
      process.exit(1);
    }

    const { data: imgUrlData } = supabase.storage
      .from('magazine-pages')
      .getPublicUrl(imageStoragePath);

    const { data: thumbUrlData } = supabase.storage
      .from('magazine-pages')
      .getPublicUrl(thumbStoragePath);

    pageRecordsToInsert.push({
      magazine_id: magazineId,
      page_number: pageNum,
      image_path: imgUrlData.publicUrl,
      thumbnail_path: thumbUrlData.publicUrl,
      width: canvasWidth,
      height: canvasHeight,
      file_size: optimizedWebpBuffer.length,
      mime_type: 'image/webp',
      render_version: 1,
    });
  }

  // Clear existing pages and insert
  console.log(`[6] Inserting ${pageRecordsToInsert.length} page records into magazine_pages...`);
  await supabase.from('magazine_pages').delete().eq('magazine_id', magazineId);
  const { error: insertPagesErr } = await supabase.from('magazine_pages').insert(pageRecordsToInsert);

  if (insertPagesErr) {
    console.error('Insert pages error:', insertPagesErr);
    process.exit(1);
  }

  // Update magazine
  const completedAt = new Date().toISOString();
  const { error: updateMagErr } = await supabase
    .from('magazines')
    .update({
      processing_status: 'COMPLETED',
      page_count: totalPages,
      processing_completed_at: completedAt,
      processed_at: completedAt,
      processing_error: null,
    })
    .eq('id', magazineId);

  if (updateMagErr) {
    console.error('Update magazine error:', updateMagErr);
    process.exit(1);
  }

  console.log('--- Pipeline Test Complete: SUCCESS! ---');
}

main().catch(console.error);
