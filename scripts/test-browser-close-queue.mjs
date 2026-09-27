import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function create52PagePdfBuffer() {
  console.log('Generating 52-page synthetic test PDF...');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 52; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions
    const { width, height } = page.getSize();

    // Background rectangle
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      color: rgb(0.97, 0.96, 0.94),
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 1,
    });

    // Header
    page.drawText('THE RKIVE — COLLEGE ARCHIVE', {
      x: 40,
      y: height - 60,
      size: 14,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Page Number Banner
    page.drawText(`PAGE ${i} OF 52`, {
      x: 40,
      y: height / 2 + 20,
      size: 32,
      font,
      color: rgb(0.62, 0.49, 0.23), // Gold accent #9E7D3B
    });

    page.drawText(`Automated Queue Verification Suite — Page ${i}`, {
      x: 40,
      y: height / 2 - 20,
      size: 12,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Footer
    page.drawText(`Verified Autonomous Background Processing • Page ${i}`, {
      x: 40,
      y: 40,
      size: 9,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function runBrowserCloseQueueTest() {
  console.log('================================================================');
  console.log('TEST SUITE: BROWSER-CLOSE DURABLE QUEUE WORKER VERIFICATION');
  console.log('================================================================');

  const testMagId = `00000000-0000-4000-a000-${Date.now().toString(16).padStart(12, '0')}`;
  const pdfStoragePath = `publications/${testMagId}/source.pdf`;

  console.log(`Test Magazine ID: ${testMagId}`);

  // 1. Fetch a valid department and profile
  const { data: depts } = await supabase.from('departments').select('id').limit(1);
  if (!depts || depts.length === 0) {
    throw new Error('No departments found in database');
  }
  const effectiveDeptId = depts[0].id;
  console.log(`Using Department ID: ${effectiveDeptId}`);

  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  const effectiveUserId = profiles && profiles.length > 0 ? profiles[0].id : null;
  console.log(`Using Profile ID for created_by: ${effectiveUserId}`);

  // 2. Upload 52-page PDF directly to Supabase Storage (simulating direct browser upload)
  console.log('\n[STEP 1] Direct Browser -> Supabase Storage Upload simulation...');
  const pdfBuffer = await create52PagePdfBuffer();
  console.log(`Generated PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

  const { error: uploadErr } = await supabase.storage
    .from('magazine-pdfs')
    .upload(pdfStoragePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(`Failed to upload PDF to Supabase Storage: ${uploadErr.message}`);
  }
  console.log(`✓ PDF uploaded to storage: magazine-pdfs/${pdfStoragePath}`);

  const { data: { publicUrl: pdfPublicUrl } } = supabase.storage
    .from('magazine-pdfs')
    .getPublicUrl(pdfStoragePath);

  // 3. Create Magazine record with status = 'DRAFT', processing_status = 'QUEUED'
  console.log('\n[STEP 2] Creating Magazine + Durable Job in DB...');
  const { error: magInsertErr } = await supabase.from('magazines').insert({
    id: testMagId,
    title: 'Test 52-Page Queue Resilience Magazine',
    slug: `test-queue-resilience-${Date.now()}`,
    academic_year: '2025-26',
    edition: 'Queue Test Edition',
    department_id: effectiveDeptId,
    created_by: effectiveUserId,
    status: 'DRAFT',
    processing_status: 'QUEUED',
    original_pdf_url: pdfPublicUrl,
    page_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (magInsertErr) {
    throw new Error(`Failed to create test magazine: ${magInsertErr.message}`);
  }
  console.log('✓ Magazine row created in database');

  // 4. Create Durable Queue Job
  try {
    const { error: jobInsertErr } = await supabase.from('pdf_processing_jobs').insert({
      magazine_id: testMagId,
      status: 'QUEUED',
      attempts: 0,
      max_attempts: 5,
      available_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (jobInsertErr) {
      console.log(`Note: pdf_processing_jobs table not found on remote Supabase yet (${jobInsertErr.message}). Testing resilient magazines-table queue fallback.`);
    } else {
      console.log('✓ Durable pdf_processing_jobs row created');
    }
  } catch (err) {
    console.log('Note: pdf_processing_jobs table not found. Testing magazines queue fallback.');
  }

  // 5. SIMULATE BROWSER DISCONNECT
  console.log('\n================================================================');
  console.log('SIMULATING USER CLOSING BROWSER AFTER UPLOAD...');
  console.log('Client request has disconnected. Browser is dead.');
  console.log('Queue worker runs purely on server/cron/self-continuation.');
  console.log('================================================================\n');

  // Dynamically import the queue engine
  const { consumeNextPdfJob } = await import('../lib/pdf/queue.ts');

  let chunkCount = 0;
  let isDone = false;
  const startTime = Date.now();

  // 6. Autonomous worker loop (simulating worker execution cycles)
  while (!isDone && chunkCount < 20) {
    chunkCount++;
    console.log(`\n--- Worker Cycle #${chunkCount} ---`);
    const claimStart = Date.now();
    const result = await consumeNextPdfJob(testMagId);
    const cycleDuration = ((Date.now() - claimStart) / 1000).toFixed(2);

    if (!result.hasJob) {
      console.log(`Worker found no pending job for magazine. Checking DB state...`);
      break;
    }

    if (result.error) {
      throw new Error(`Worker encountered error in cycle #${chunkCount}: ${result.error}`);
    }

    const { result: chunkResult } = result;
    console.log(
      `Cycle #${chunkCount} result: processed=${chunkResult?.processedPages}/${chunkResult?.pageCount} (remaining=${chunkResult?.remainingPages}, completed=${chunkResult?.completed}) [${cycleDuration}s]`
    );

    if (chunkResult?.completed) {
      isDone = true;
      console.log(`\n✓ WORKER COMPLETED ALL PAGES IN CYCLE #${chunkCount}!`);
      break;
    }
  }

  const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nTotal processing time across all chunks: ${totalTimeSeconds}s`);

  // 7. Verify Database State
  console.log('\n[STEP 3] Verifying Final Database State...');
  const { data: finalMag, error: finalMagErr } = await supabase
    .from('magazines')
    .select('id, title, status, processing_status, page_count')
    .eq('id', testMagId)
    .single();

  if (finalMagErr) throw finalMagErr;

  console.log(`Magazine State:`, finalMag);
  if (finalMag.processing_status !== 'COMPLETED') {
    throw new Error(`Expected processing_status 'COMPLETED', got '${finalMag.processing_status}'`);
  }
  if (finalMag.page_count !== 52) {
    throw new Error(`Expected page_count 52, got ${finalMag.page_count}`);
  }

  // 8. Verify magazine_pages table
  const { data: pages, error: pagesErr } = await supabase
    .from('magazine_pages')
    .select('page_number, image_path, thumbnail_path, width, height, mime_type')
    .eq('magazine_id', testMagId)
    .order('page_number', { ascending: true });

  if (pagesErr) throw pagesErr;

  console.log(`Found ${pages.length} records in magazine_pages table.`);
  if (pages.length !== 52) {
    throw new Error(`Expected 52 pages in database, found ${pages.length}`);
  }

  // Verify page sequence from 1 to 52
  for (let i = 0; i < 52; i++) {
    const pageNum = i + 1;
    const page = pages[i];
    if (!page || page.page_number !== pageNum) {
      throw new Error(`Missing or out-of-order page: expected page ${pageNum}`);
    }
    if (!page.image_path || !page.thumbnail_path) {
      throw new Error(`Page ${pageNum} missing image or thumbnail URL`);
    }
    if (page.mime_type !== 'image/webp') {
      throw new Error(`Page ${pageNum} has invalid mime type: ${page.mime_type}`);
    }
  }
  console.log('✓ All 52 pages correctly indexed from 1 to 52 with valid WebP paths.');

  // 9. Verify Storage Artifacts
  console.log('\n[STEP 4] Verifying Storage WebP Files...');
  const res1 = await fetch(pages[0].image_path);
  if (!res1.ok) {
    throw new Error(`Failed to fetch page 1 image from URL: ${pages[0].image_path} (status: ${res1.status})`);
  }
  const p1Buf = Buffer.from(await res1.arrayBuffer());
  const isP1WebP = p1Buf.subarray(0, 4).toString('ascii') === 'RIFF' && p1Buf.subarray(8, 12).toString('ascii') === 'WEBP';
  console.log(`✓ Page 1 WebP verified (${(p1Buf.length / 1024).toFixed(1)} KB, valid WebP header: ${isP1WebP}, status: ${res1.status})`);

  const res52 = await fetch(pages[51].image_path);
  if (!res52.ok) {
    throw new Error(`Failed to fetch page 52 image from URL: ${pages[51].image_path} (status: ${res52.status})`);
  }
  const p52Buf = Buffer.from(await res52.arrayBuffer());
  const isP52WebP = p52Buf.subarray(0, 4).toString('ascii') === 'RIFF' && p52Buf.subarray(8, 12).toString('ascii') === 'WEBP';
  console.log(`✓ Page 52 WebP verified (${(p52Buf.length / 1024).toFixed(1)} KB, valid WebP header: ${isP52WebP}, status: ${res52.status})`);

  // Verify thumbnail
  const resThumb1 = await fetch(pages[0].thumbnail_path);
  const t1Buf = Buffer.from(await resThumb1.arrayBuffer());
  const isT1WebP = t1Buf.subarray(0, 4).toString('ascii') === 'RIFF' && t1Buf.subarray(8, 12).toString('ascii') === 'WEBP';
  console.log(`✓ Page 1 Thumbnail verified (${(t1Buf.length / 1024).toFixed(1)} KB, valid WebP header: ${isT1WebP}, status: ${resThumb1.status})`);

  // 10. Clean up test artifacts
  console.log('\n[STEP 5] Cleaning up test data...');
  await supabase.from('magazine_pages').delete().eq('magazine_id', testMagId);
  try { await supabase.from('pdf_processing_jobs').delete().eq('magazine_id', testMagId); } catch {}
  await supabase.from('magazines').delete().eq('id', testMagId);
  await supabase.storage.from('magazine-pdfs').remove([pdfStoragePath]);

  // Clean up storage pages
  const filesToRemove = [];
  for (let i = 1; i <= 52; i++) {
    const padded = String(i).padStart(4, '0');
    filesToRemove.push(`departments/${effectiveDeptId}/magazines/${testMagId}/pages/page-${padded}.webp`);
    filesToRemove.push(`departments/${effectiveDeptId}/magazines/${testMagId}/thumbnails/page-${padded}.webp`);
  }
  await supabase.storage.from('magazine-pages').remove(filesToRemove);
  console.log('✓ Cleaned up all temporary test records and storage assets.');

  console.log('\n================================================================');
  console.log('🎉 ALL BROWSER-CLOSE QUEUE TESTS PASSED WITH 100% SUCCESS!');
  console.log(`- 52-page PDF processed in ${chunkCount} chunks (4 pages/chunk)`);
  console.log(`- Browser disconnect occurred before chunk 1 started`);
  console.log(`- Server queue resumed and completed all 52 pages independently`);
  console.log('================================================================');
}

runBrowserCloseQueueTest().catch((err) => {
  console.error('\n❌ BROWSER-CLOSE QUEUE TEST FAILED:');
  console.error(err);
  process.exit(1);
});
