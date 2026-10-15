import fs from 'fs';

// Read .env.local natively without external dependencies
if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { createClient } from '@supabase/supabase-js';
import { getCoverUrl, getPageImageUrl, getPageThumbnailUrl, getStorageAssetUrl } from '../lib/storage/urls.ts';

const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=====================================================');
console.log('LIVE R2 READ PATH VALIDATION');
console.log('=====================================================');
console.log(`Configured R2 URL: ${r2Base}\n`);

if (!r2Base) {
  console.error('ERROR: NEXT_PUBLIC_R2_PUBLIC_URL is not set.');
  process.exit(1);
}

const supabase = createClient(supaUrl, supaKey);

async function validateUrl(url, expectedType) {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status} ${res.statusText}` };
    }
    const contentType = res.headers.get('content-type') || '';
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Validate image format magic numbers
    let detectedFormat = 'unknown';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      detectedFormat = 'png';
    } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      detectedFormat = 'jpeg';
    } else if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      detectedFormat = 'webp';
    }

    return {
      success: true,
      statusCode: res.status,
      contentType,
      contentLength,
      detectedFormat,
      byteCount: bytes.length,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function run() {
  let passed = 0;
  let failed = 0;

  // 1. Fetch real magazine covers from database
  console.log('[1/3] Testing Magazine Covers from Database...');
  const { data: magazines, error: magError } = await supabase
    .from('magazines')
    .select('id, title, cover_image_url')
    .not('cover_image_url', 'is', null)
    .limit(5);

  if (magError) {
    console.error('Database query error for magazines:', magError.message);
  } else if (magazines && magazines.length > 0) {
    for (const mag of magazines) {
      const resolvedUrl = getCoverUrl(mag.cover_image_url);
      const isR2 = resolvedUrl.startsWith(r2Base);
      const check = await validateUrl(resolvedUrl, 'image');

      if (isR2 && check.success) {
        console.log(`  ✓ COVER: "${mag.title.slice(0, 30)}" -> HTTP ${check.statusCode} (${check.detectedFormat.toUpperCase()}, ${(check.byteCount / 1024).toFixed(1)} KB)`);
        passed++;
      } else {
        console.error(`  ✗ COVER FAILED: "${mag.title}" -> ${check.error || 'Not R2 URL'}`);
        console.error(`    Resolved URL: ${resolvedUrl}`);
        failed++;
      }
    }
  }

  // 2. Fetch real magazine page images and thumbnails
  console.log('\n[2/3] Testing Magazine Pages and Thumbnails from Database...');
  const { data: pages, error: pageError } = await supabase
    .from('magazine_pages')
    .select('id, magazine_id, page_number, image_path, thumbnail_path')
    .limit(5);

  if (pageError) {
    console.error('Database query error for pages:', pageError.message);
  } else if (pages && pages.length > 0) {
    for (const page of pages) {
      // Test full page image
      const resolvedPageUrl = getPageImageUrl(page.image_path);
      const pageCheck = await validateUrl(resolvedPageUrl, 'image/webp');
      if (resolvedPageUrl.startsWith(r2Base) && pageCheck.success && pageCheck.detectedFormat === 'webp') {
        console.log(`  ✓ PAGE ${page.page_number}: HTTP ${pageCheck.statusCode} (WEBP, ${(pageCheck.byteCount / 1024).toFixed(1)} KB)`);
        passed++;
      } else {
        console.error(`  ✗ PAGE ${page.page_number} FAILED: ${pageCheck.error}`);
        console.error(`    Resolved URL: ${resolvedPageUrl}`);
        failed++;
      }

      // Test thumbnail
      const resolvedThumbUrl = getPageThumbnailUrl(page.thumbnail_path);
      const thumbCheck = await validateUrl(resolvedThumbUrl, 'image/webp');
      if (resolvedThumbUrl.startsWith(r2Base) && thumbCheck.success && thumbCheck.detectedFormat === 'webp') {
        console.log(`  ✓ THUMBNAIL ${page.page_number}: HTTP ${thumbCheck.statusCode} (WEBP, ${(thumbCheck.byteCount / 1024).toFixed(1)} KB)`);
        passed++;
      } else {
        console.error(`  ✗ THUMBNAIL ${page.page_number} FAILED: ${thumbCheck.error}`);
        console.error(`    Resolved URL: ${resolvedThumbUrl}`);
        failed++;
      }
    }
  }

  // 3. Security Check: Verify Private PDFs and CMS JSON are 404 on R2 public URL
  console.log('\n[3/3] Testing Security Boundaries on R2 Public URL...');
  const { data: pdfMag } = await supabase
    .from('magazines')
    .select('id, original_pdf_url')
    .not('original_pdf_url', 'is', null)
    .limit(1)
    .single();

  if (pdfMag && pdfMag.original_pdf_url) {
    // 3a. Verify that getStorageAssetUrl refuses to map PDFs to R2
    const pdfResolved = getStorageAssetUrl(pdfMag.original_pdf_url, { bucket: 'magazine-pdfs' });
    const isProtectedInApp = !pdfResolved.startsWith(r2Base);
    if (isProtectedInApp) {
      console.log('  ✓ PDF IN-APP RESOLVER: Protected (did not output R2 public URL)');
      passed++;
    } else {
      console.error('  ✗ PDF IN-APP RESOLVER: Leak detected! Generated R2 public URL');
      failed++;
    }

    // 3b. Verify that attempting to fetch PDF directly from R2 public URL returns HTTP 404
    const simulatedPdfR2Url = `${r2Base}/magazine-pdfs/${pdfMag.original_pdf_url.replace(/^.*magazine-pdfs\//, '')}`;
    const r2PdfRes = await fetch(simulatedPdfR2Url, { method: 'HEAD' });
    if (r2PdfRes.status === 404) {
      console.log(`  ✓ PDF R2 BUCKET: Protected (HTTP 404 Not Found at ${simulatedPdfR2Url.slice(0, 60)}...)`);
      passed++;
    } else {
      console.error(`  ✗ PDF R2 BUCKET: Exposed! Returned status ${r2PdfRes.status}`);
      failed++;
    }
  }

  // 3c. CMS Config check
  const simulatedCmsR2Url = `${r2Base}/cms-assets/cms-data/landing-page-config.json`;
  const r2CmsRes = await fetch(simulatedCmsR2Url, { method: 'HEAD' });
  if (r2CmsRes.status === 404) {
    console.log('  ✓ CMS DATA R2 BUCKET: Protected (HTTP 404 Not Found for landing-page-config.json)');
    passed++;
  } else {
    console.error(`  ✗ CMS DATA R2 BUCKET: Exposed! Returned status ${r2CmsRes.status}`);
    failed++;
  }

  console.log('=====================================================');
  console.log(`VALIDATION RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');
  if (failed > 0) process.exit(1);
}

run();
