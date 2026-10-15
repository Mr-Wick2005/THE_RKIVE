import fs from 'fs';

// Read .env.local natively
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

import {
  isR2ServerConfigured,
  createR2PresignedUploadUrl,
  createR2PresignedDownloadUrl,
  uploadToR2,
  downloadFromR2,
  deleteFromR2,
  checkR2ObjectExists,
  resolveBucketName,
} from '../lib/storage/r2.ts';
import { getStorageAssetUrl, getCoverUrl, getPageImageUrl } from '../lib/storage/urls.ts';
import { createClient } from '@supabase/supabase-js';

const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=====================================================');
console.log('PHASE 5 INTEGRATION TEST SUITE');
console.log('=====================================================');
console.log(`R2 Public Domain: ${r2Base}`);
console.log(`R2 Server Configured: ${isR2ServerConfigured()}\n`);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  // TEST 1: Bucket Scopes & Routing
  console.log('[Test 1] Bucket Scopes & Isolation');
  assert(resolveBucketName('public') === 'magazine-files-public', 'Public scope maps to magazine-files-public');
  assert(resolveBucketName('private') === 'magazine-files-private', 'Private scope maps to magazine-files-private');

  // TEST 2: Presigned Cover Upload URL (Public Bucket)
  console.log('\n[Test 2] Presigned Cover Upload URL (Public)');
  const testCoverKey = 'magazine-covers/test-phase5/canary-cover.jpg';
  const coverPresign = await createR2PresignedUploadUrl({
    scope: 'public',
    key: testCoverKey,
    contentType: 'image/jpeg',
  });

  assert(Boolean(coverPresign.signedUrl), 'Cover signedUrl generated');
  assert(coverPresign.bucket === 'magazine-files-public', 'Cover bucket is magazine-files-public');
  assert(Boolean(coverPresign.publicUrl) && coverPresign.publicUrl.startsWith(r2Base), 'Cover has valid public CDN URL');

  // TEST 3: Presigned PDF Upload URL (Private Bucket)
  console.log('\n[Test 3] Presigned PDF Upload URL (Private)');
  const testPdfKey = 'magazine-pdfs/test-phase5/canary-publication.pdf';
  const pdfPresign = await createR2PresignedUploadUrl({
    scope: 'private',
    key: testPdfKey,
    contentType: 'application/pdf',
  });

  assert(Boolean(pdfPresign.signedUrl), 'PDF signedUrl generated');
  assert(pdfPresign.bucket === 'magazine-files-private', 'PDF bucket is magazine-files-private');
  assert(pdfPresign.publicUrl === undefined, 'Private PDF has NO public URL');

  // TEST 4: Direct Browser PUT Upload Simulation (Cover)
  console.log('\n[Test 4] Direct Browser PUT Simulation (Cover -> Public)');
  // 1x1 pixel JPEG
  const sampleJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x80, 0xff, 0xd9,
  ]);

  const coverPutRes = await fetch(coverPresign.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: sampleJpeg,
  });
  assert(coverPutRes.ok, `Cover PUT succeeded (HTTP ${coverPutRes.status})`);

  // Verify readable via public CDN
  const cdnRes = await fetch(coverPresign.publicUrl);
  assert(cdnRes.ok, `Cover publicly accessible via CDN (HTTP ${cdnRes.status})`);
  assert(cdnRes.headers.get('content-type')?.includes('image/jpeg'), 'CDN returns Content-Type: image/jpeg');

  // TEST 5: Direct Browser PUT Upload Simulation (PDF)
  console.log('\n[Test 5] Direct Browser PUT Simulation (PDF -> Private)');
  const samplePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
  const pdfPutRes = await fetch(pdfPresign.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: samplePdf,
  });
  assert(pdfPutRes.ok, `PDF PUT succeeded (HTTP ${pdfPutRes.status})`);

  // Verify PDF is NOT readable via public CDN
  const publicPdfUrl = `${r2Base}/${testPdfKey}`;
  const publicPdfRes = await fetch(publicPdfUrl);
  assert(publicPdfRes.status === 404, `PDF is strictly protected: HTTP 404 on public domain (${publicPdfRes.status})`);

  // TEST 6: Private Download via Server-Side S3 SDK
  console.log('\n[Test 6] Server-Side Private PDF Download');
  const downloadedBuf = await downloadFromR2({ scope: 'private', key: testPdfKey });
  assert(Boolean(downloadedBuf) && downloadedBuf.toString('ascii').startsWith('%PDF-'), 'Server-side download from private bucket succeeded');

  // TEST 7: Short-lived Signed Download URL
  console.log('\n[Test 7] Authenticated Short-Lived Signed Download URL');
  const signedDownloadUrl = await createR2PresignedDownloadUrl({ key: testPdfKey, expiresInSeconds: 60 });
  const signedDownloadRes = await fetch(signedDownloadUrl);
  assert(signedDownloadRes.ok, `Signed download URL returns HTTP ${signedDownloadRes.status}`);

  // TEST 8: Server-side Page WebP Upload with Immutable Caching
  console.log('\n[Test 8] Server-Side Rasterizer WebP Upload (Immutable Caching)');
  const pageKey = 'magazine-pages/test-phase5/page-0001.webp';
  // Minimal WebP 1x1
  const sampleWebp = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x4c, 0x0e, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
    0x00, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  const pageUpload = await uploadToR2({
    scope: 'public',
    key: pageKey,
    body: sampleWebp,
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
  });

  assert(Boolean(pageUpload.publicUrl), 'Page WebP uploaded with public URL');
  const pageCdnRes = await fetch(pageUpload.publicUrl);
  assert(pageCdnRes.ok, `Page WebP returns HTTP ${pageCdnRes.status} from CDN`);
  assert(pageCdnRes.headers.get('cache-control')?.includes('immutable'), 'Page WebP has immutable cache-control header');

  // TEST 9: Cleanup Canary Files
  console.log('\n[Test 9] Cleanup Canary Test Assets');
  await deleteFromR2({ scope: 'public', key: testCoverKey });
  await deleteFromR2({ scope: 'private', key: testPdfKey });
  await deleteFromR2({ scope: 'public', key: pageKey });

  const coverClean = !(await checkR2ObjectExists({ scope: 'public', key: testCoverKey }));
  const pdfClean = !(await checkR2ObjectExists({ scope: 'private', key: testPdfKey }));
  const pageClean = !(await checkR2ObjectExists({ scope: 'public', key: pageKey }));

  assert(coverClean && pdfClean && pageClean, 'All test canary objects cleaned up from R2');

  // TEST 10: Fallback Verification (Supabase URL Resolver)
  console.log('\n[Test 10] Supabase Fallback Verification');
  const legacyCover = 'https://zeeomstjmbcnmxmhqcgs.supabase.co/storage/v1/object/public/magazine-covers/CSE/test/cover.jpg';
  const legacyResolved = getCoverUrl(legacyCover);
  assert(legacyResolved.startsWith(r2Base), 'Legacy Supabase cover seamlessly resolves to R2 public CDN');

  const legacyPdf = 'CSE/test/original.pdf';
  const pdfResolved = getStorageAssetUrl(legacyPdf, { bucket: 'magazine-pdfs' });
  assert(!pdfResolved.startsWith(r2Base) && pdfResolved === legacyPdf, 'Protected PDF remains unexposed by URL resolver');

  console.log('=====================================================');
  console.log(`PHASE 5 TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner exception:', err);
  process.exit(1);
});
