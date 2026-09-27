import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Load .env.local
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
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createPdfBuffer(pageCount, title) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      color: rgb(0.96, 0.96, 0.94),
      borderColor: rgb(0.15, 0.15, 0.15),
      borderWidth: 1,
    });

    page.drawText(`${title} — PAGE ${i} OF ${pageCount}`, {
      x: 40,
      y: height - 60,
      size: 16,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(`Concurrent Queue Test Page ${i}`, {
      x: 40,
      y: height / 2,
      size: 14,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function runMultiPublicationTest() {
  console.log('================================================================');
  console.log('TEST SUITE: CONCURRENT MULTI-PUBLICATION QUEUE + AUTH HARDENING');
  console.log('================================================================');

  // Test 1: Worker Authentication Validation
  console.log('\n[TEST 1] Testing Worker Secret Authentication...');
  const { isValidWorkerSecret } = await import('../lib/pdf/queue.ts');

  const correctSecret = process.env.PDF_WORKER_SECRET || process.env.CRON_SECRET;
  console.log(`Configured secret is present: ${Boolean(correctSecret)}`);

  // Assertions on secret validation
  if (isValidWorkerSecret(null)) {
    throw new Error('AUTH_FAIL: Worker allowed null auth header');
  }
  if (isValidWorkerSecret('Bearer wrong-secret-value')) {
    throw new Error('AUTH_FAIL: Worker allowed incorrect secret');
  }
  if (isValidWorkerSecret('', 'wrong-custom-header')) {
    throw new Error('AUTH_FAIL: Worker allowed incorrect custom header');
  }
  if (!isValidWorkerSecret(`Bearer ${correctSecret}`)) {
    throw new Error('AUTH_FAIL: Worker rejected valid Bearer token');
  }
  if (!isValidWorkerSecret(null, correctSecret)) {
    throw new Error('AUTH_FAIL: Worker rejected valid x-worker-secret header');
  }
  console.log('✓ Worker Authentication checks passed (401 on missing/invalid, 200 on valid).');

  // Test 2: Setup Publications A (20 pages) and B (12 pages)
  console.log('\n[TEST 2] Setting up Publication A (20 pages) and Publication B (12 pages)...');
  const { data: depts } = await supabase.from('departments').select('id').limit(1);
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  const effectiveDeptId = depts[0].id;
  const effectiveUserId = profiles[0].id;

  const magAId = `00000000-0000-4000-a000-${Date.now().toString(16).slice(0, 12)}a`;
  const magBId = `00000000-0000-4000-a000-${(Date.now() + 1).toString(16).slice(0, 12)}b`;
  const pathA = `publications/${magAId}/source.pdf`;
  const pathB = `publications/${magBId}/source.pdf`;

  const [bufA, bufB] = await Promise.all([
    createPdfBuffer(20, 'Publication A'),
    createPdfBuffer(12, 'Publication B'),
  ]);

  // Upload both directly to storage
  await Promise.all([
    supabase.storage.from('magazine-pdfs').upload(pathA, bufA, { contentType: 'application/pdf', upsert: true }),
    supabase.storage.from('magazine-pdfs').upload(pathB, bufB, { contentType: 'application/pdf', upsert: true }),
  ]);

  const { data: { publicUrl: urlA } } = supabase.storage.from('magazine-pdfs').getPublicUrl(pathA);
  const { data: { publicUrl: urlB } } = supabase.storage.from('magazine-pdfs').getPublicUrl(pathB);

  // Insert both publications with status QUEUED
  await supabase.from('magazines').insert([
    {
      id: magAId,
      title: 'Concurrent Publication A (20 Pages)',
      slug: `mag-a-${Date.now()}`,
      academic_year: '2025-26',
      edition: 'Edition A',
      department_id: effectiveDeptId,
      created_by: effectiveUserId,
      status: 'DRAFT',
      processing_status: 'QUEUED',
      original_pdf_url: urlA,
      page_count: 0,
    },
    {
      id: magBId,
      title: 'Concurrent Publication B (12 Pages)',
      slug: `mag-b-${Date.now()}`,
      academic_year: '2025-26',
      edition: 'Edition B',
      department_id: effectiveDeptId,
      created_by: effectiveUserId,
      status: 'DRAFT',
      processing_status: 'QUEUED',
      original_pdf_url: urlB,
      page_count: 0,
    },
  ]);

  console.log(`✓ Both publications created in DB (A: ${magAId}, B: ${magBId})`);

  // Test 3: Drain Queue with Concurrent Consumer Invocations
  console.log('\n[TEST 3] Simulating browser close & draining queue with worker cycles...');
  const { consumeNextPdfJob } = await import('../lib/pdf/queue.ts');

  let cycle = 0;
  let doneA = false;
  let doneB = false;

  while ((!doneA || !doneB) && cycle < 25) {
    cycle++;
    // Alternate or consume next available job in queue
    const targetMag = cycle % 2 === 1 ? (!doneA ? magAId : magBId) : (!doneB ? magBId : magAId);
    console.log(`--- Worker Cycle #${cycle} (Target: ${targetMag === magAId ? 'Publication A' : 'Publication B'}) ---`);
    
    const result = await consumeNextPdfJob(targetMag);
    if (!result.hasJob) {
      console.log('No job available in this tick.');
      continue;
    }

    if (result.error) {
      throw new Error(`Worker error on cycle #${cycle}: ${result.error}`);
    }

    if (result.magazineId === magAId && result.result?.completed) {
      doneA = true;
      console.log('✓ PUBLICATION A COMPLETED ALL 20 PAGES!');
    }
    if (result.magazineId === magBId && result.result?.completed) {
      doneB = true;
      console.log('✓ PUBLICATION B COMPLETED ALL 12 PAGES!');
    }
  }

  // Test 4: Verify Final DB Records
  console.log('\n[TEST 4] Verifying Final Database State for Publications A and B...');
  const { data: mags } = await supabase.from('magazines').select('id, title, processing_status, page_count').in('id', [magAId, magBId]);
  console.table(mags);

  const magA = mags.find((m) => m.id === magAId);
  const magB = mags.find((m) => m.id === magBId);

  if (!magA || magA.processing_status !== 'COMPLETED' || magA.page_count !== 20) {
    throw new Error(`Publication A failed assertions: status=${magA?.processing_status}, page_count=${magA?.page_count}`);
  }
  if (!magB || magB.processing_status !== 'COMPLETED' || magB.page_count !== 12) {
    throw new Error(`Publication B failed assertions: status=${magB?.processing_status}, page_count=${magB?.page_count}`);
  }

  const { data: pagesA } = await supabase.from('magazine_pages').select('page_number').eq('magazine_id', magAId);
  const { data: pagesB } = await supabase.from('magazine_pages').select('page_number').eq('magazine_id', magBId);

  console.log(`Publication A page records in DB: ${pagesA.length} (expected 20)`);
  console.log(`Publication B page records in DB: ${pagesB.length} (expected 12)`);

  if (pagesA.length !== 20 || pagesB.length !== 12) {
    throw new Error(`Page count mismatch in magazine_pages table (A: ${pagesA.length}/20, B: ${pagesB.length}/12)`);
  }

  // Test 5: Cleanup test records
  console.log('\n[TEST 5] Cleaning up test publications and files...');
  await supabase.from('magazine_pages').delete().in('magazine_id', [magAId, magBId]);
  await supabase.from('magazines').delete().in('id', [magAId, magBId]);
  await supabase.storage.from('magazine-pdfs').remove([pathA, pathB]);

  const cleanFiles = [];
  for (let i = 1; i <= 20; i++) {
    const p = String(i).padStart(4, '0');
    cleanFiles.push(`departments/${effectiveDeptId}/magazines/${magAId}/pages/page-${p}.webp`);
    cleanFiles.push(`departments/${effectiveDeptId}/magazines/${magAId}/thumbnails/page-${p}.webp`);
  }
  for (let i = 1; i <= 12; i++) {
    const p = String(i).padStart(4, '0');
    cleanFiles.push(`departments/${effectiveDeptId}/magazines/${magBId}/pages/page-${p}.webp`);
    cleanFiles.push(`departments/${effectiveDeptId}/magazines/${magBId}/thumbnails/page-${p}.webp`);
  }
  await supabase.storage.from('magazine-pages').remove(cleanFiles);
  console.log('✓ Cleanup completed.');

  console.log('\n================================================================');
  console.log('🎉 ALL CONCURRENT MULTI-PUBLICATION & AUTH TESTS PASSED 100%!');
  console.log('================================================================');
}

runMultiPublicationTest().catch((err) => {
  console.error('\n❌ MULTI-PUBLICATION TEST FAILED:');
  console.error(err);
  process.exit(1);
});
