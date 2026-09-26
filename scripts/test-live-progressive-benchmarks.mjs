import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { processMagazinePdf } from '../lib/pdf/pipeline';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function generateTestPdf(pageCount) {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([595, 842]);
    page.drawText(`THE RKIVE - BENCHMARK ISSUE (PAGE ${i} OF ${pageCount})`, {
      x: 50,
      y: 780,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.35),
    });
    for (let j = 0; j < 12; j++) {
      page.drawText(
        `Article paragraph ${j + 1}: High-performance digital magazine architecture with chunked WebP rendering and resilient storage sync.`,
        { x: 50, y: 730 - j * 35, size: 9.5, font: fontRegular, color: rgb(0.25, 0.25, 0.25) }
      );
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function runLiveBenchmarks() {
  console.log('==================================================');
  console.log('STARTING REAL PROGRESSIVE PDF PIPELINE BENCHMARKS');
  console.log('==================================================\n');

  // Fetch or setup test magazine
  const { data: magazine, error: magErr } = await supabase
    .from('magazines')
    .select('*')
    .eq('slug', 'innovate-insight')
    .single();

  if (magErr || !magazine) {
    console.error('Magazine not found:', magErr);
    process.exit(1);
  }

  const results = [];

  // TEST 1: 10 Pages
  console.log('--- TEST 1: 10-PAGE PDF ---');
  const pdf10 = await generateTestPdf(10);
  const path10 = `${magazine.department_id}/${magazine.id}/test-10pg.pdf`;
  await supabase.storage.from('magazine-pdfs').upload(path10, pdf10, { contentType: 'application/pdf', upsert: true });
  await supabase.from('magazines').update({ original_pdf_url: path10, processing_status: 'QUEUED' }).eq('id', magazine.id);

  const t10Start = Date.now();
  const res10 = await processMagazinePdf(magazine.id, { forceReprocess: true });
  const t10Dur = (Date.now() - t10Start) / 1000;
  console.log(`10-Page Result: success=${res10.success}, duration=${t10Dur.toFixed(2)}s, avg=${(t10Dur / 10).toFixed(3)}s/page\n`);
  results.push({ name: '10 Pages', pages: 10, sizeKb: (pdf10.length / 1024).toFixed(1), durationSec: t10Dur.toFixed(2), avgPerPageSec: (t10Dur / 10).toFixed(3) });

  // TEST 2: 21 Pages
  console.log('--- TEST 2: 21-PAGE PDF (Direct comparison with 65.07s baseline) ---');
  const pdf21 = await generateTestPdf(21);
  const path21 = `${magazine.department_id}/${magazine.id}/test-21pg.pdf`;
  await supabase.storage.from('magazine-pdfs').upload(path21, pdf21, { contentType: 'application/pdf', upsert: true });
  await supabase.from('magazines').update({ original_pdf_url: path21, processing_status: 'QUEUED' }).eq('id', magazine.id);

  const t21Start = Date.now();
  const res21 = await processMagazinePdf(magazine.id, { forceReprocess: true });
  const t21Dur = (Date.now() - t21Start) / 1000;
  console.log(`21-Page Result: success=${res21.success}, duration=${t21Dur.toFixed(2)}s, avg=${(t21Dur / 21).toFixed(3)}s/page\n`);
  results.push({ name: '21 Pages', pages: 21, sizeKb: (pdf21.length / 1024).toFixed(1), durationSec: t21Dur.toFixed(2), avgPerPageSec: (t21Dur / 21).toFixed(3) });

  // TEST 3: 52 Pages with Chunk Resumption Test
  console.log('--- TEST 3: 52-PAGE PDF (Testing Full 52 Pages + Resumption) ---');
  const pdf52 = await generateTestPdf(52);
  const path52 = `${magazine.department_id}/${magazine.id}/test-52pg.pdf`;
  await supabase.storage.from('magazine-pdfs').upload(path52, pdf52, { contentType: 'application/pdf', upsert: true });
  await supabase.from('magazines').update({ original_pdf_url: path52, processing_status: 'QUEUED' }).eq('id', magazine.id);

  // Phase A: Run first 20 pages only
  console.log('Phase A: Running first 20 pages (simulating chunk / interruption)...');
  const tChunkStart = Date.now();
  const resChunk = await processMagazinePdf(magazine.id, { forceReprocess: true, maxPagesPerRun: 20 });
  console.log(`Phase A finished: completed=${resChunk.completed}, processedPages=${resChunk.processedPages}/52`);

  // Phase B: Resume remaining pages
  console.log('Phase B: Resuming from page 21 to 52...');
  const resResume = await processMagazinePdf(magazine.id, { forceReprocess: false });
  const t52Total = (Date.now() - tChunkStart) / 1000;
  console.log(`Phase B finished: completed=${resResume.completed}, finalPages=${resResume.processedPages}/52, totalDuration=${t52Total.toFixed(2)}s\n`);
  results.push({ name: '52 Pages (Resumable)', pages: 52, sizeKb: (pdf52.length / 1024).toFixed(1), durationSec: t52Total.toFixed(2), avgPerPageSec: (t52Total / 52).toFixed(3) });

  console.log('==================================================');
  console.log('FINAL BENCHMARK COMPARISON TABLE');
  console.log('==================================================');
  console.table(results);
}

runLiveBenchmarks().catch(console.error);
