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
  getR2ServerConfig,
  createR2PresignedUploadUrl,
  createR2PresignedDownloadUrl,
  checkR2ObjectExists,
  downloadFromR2,
  uploadToR2,
  deleteFromR2,
} from '../lib/storage/r2.ts';

console.log('Testing Cloudflare R2 S3 Client...');

const isConfigured = isR2ServerConfigured();
console.log('isR2ServerConfigured:', isConfigured);

if (!isConfigured) {
  console.error('R2 server configuration is incomplete.');
  process.exit(1);
}

const config = getR2ServerConfig();
console.log('Account ID:', config.accountId ? 'Present' : 'Missing');
console.log('Access Key ID:', config.accessKeyId ? 'Present' : 'Missing');
console.log('Public Bucket:', config.publicBucket);
console.log('Private Bucket:', config.privateBucket);

async function run() {
  let passed = 0;
  let failed = 0;

  // 1. Presigned Upload URL for Cover (Public bucket)
  try {
    const coverPresign = await createR2PresignedUploadUrl({
      scope: 'public',
      key: 'magazine-covers/test/sample-cover.jpg',
      contentType: 'image/jpeg',
    });
    if (coverPresign.signedUrl && coverPresign.bucket === 'magazine-files-public' && coverPresign.publicUrl) {
      console.log('  ✓ Presigned Cover Upload URL generated successfully');
      console.log(`    Bucket: ${coverPresign.bucket}`);
      console.log(`    Public URL: ${coverPresign.publicUrl}`);
      passed++;
    } else {
      console.error('  ✗ Presigned Cover Upload URL failed:', coverPresign);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ Error generating cover upload URL:', err);
    failed++;
  }

  // 2. Presigned Upload URL for PDF (Private bucket)
  try {
    const pdfPresign = await createR2PresignedUploadUrl({
      scope: 'private',
      key: 'magazine-pdfs/test/sample.pdf',
      contentType: 'application/pdf',
    });
    if (pdfPresign.signedUrl && pdfPresign.bucket === 'magazine-files-private' && !pdfPresign.publicUrl) {
      console.log('  ✓ Presigned PDF Upload URL generated successfully (Private, NO public URL)');
      console.log(`    Bucket: ${pdfPresign.bucket}`);
      passed++;
    } else {
      console.error('  ✗ Presigned PDF Upload URL failed:', pdfPresign);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ Error generating PDF upload URL:', err);
    failed++;
  }

  // 3. Presigned Download URL for PDF
  try {
    const downloadUrl = await createR2PresignedDownloadUrl({
      key: 'magazine-pdfs/test/sample.pdf',
      expiresInSeconds: 60,
    });
    if (downloadUrl && downloadUrl.includes('X-Amz-Signature')) {
      console.log('  ✓ Presigned PDF Download URL generated successfully with AWS signature');
      passed++;
    } else {
      console.error('  ✗ Presigned PDF Download URL invalid:', downloadUrl);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ Error generating PDF download URL:', err);
    failed++;
  }

  // 4. Test live upload & delete of canary object in public bucket
  try {
    const canaryKey = 'canary-test/health-check.txt';
    const uploadRes = await uploadToR2({
      scope: 'public',
      key: canaryKey,
      body: Buffer.from('Cloudflare R2 Health Check OK'),
      contentType: 'text/plain',
      cacheControl: 'no-cache',
    });
    console.log('  ✓ Live upload to R2 public bucket succeeded');

    const exists = await checkR2ObjectExists({ scope: 'public', key: canaryKey });
    if (exists) {
      console.log('  ✓ checkR2ObjectExists confirmed canary object presence');
      passed++;
    } else {
      console.error('  ✗ checkR2ObjectExists failed to find canary object');
      failed++;
    }

    await deleteFromR2({ scope: 'public', key: canaryKey });
    const existsAfterDelete = await checkR2ObjectExists({ scope: 'public', key: canaryKey });
    if (!existsAfterDelete) {
      console.log('  ✓ Canary object cleaned up successfully');
      passed++;
    } else {
      console.error('  ✗ Canary object still present after delete');
      failed++;
    }

    // 5. End-to-end Presigned PUT Upload -> R2 Public Read test
    console.log('\nTesting End-to-End Presigned PUT upload and public read...');
    const putTestKey = 'magazine-covers/canary/presigned-put-test.txt';
    const putPresign = await createR2PresignedUploadUrl({
      scope: 'public',
      key: putTestKey,
      contentType: 'text/plain',
    });

    const putRes = await fetch(putPresign.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'Verified Presigned Upload from The Archive',
    });

    if (putRes.ok) {
      console.log('  ✓ Presigned HTTP PUT to Cloudflare R2 succeeded (HTTP ' + putRes.status + ')');
      passed++;
    } else {
      console.error('  ✗ Presigned HTTP PUT failed with status:', putRes.status, await putRes.text());
      failed++;
    }

    // Verify it is readable from the public CDN domain
    const cdnRes = await fetch(putPresign.publicUrl);
    const cdnText = await cdnRes.text();
    if (cdnRes.ok && cdnText === 'Verified Presigned Upload from The Archive') {
      console.log('  ✓ CDN Public GET succeeded with exact matched body:', cdnText);
      passed++;
    } else {
      console.error('  ✗ CDN Public GET failed:', cdnRes.status, cdnText);
      failed++;
    }

    // Clean up
    await deleteFromR2({ scope: 'public', key: putTestKey });
    console.log('  ✓ Test asset cleaned up');
  } catch (err) {
    console.error('  ✗ Live R2 upload test failed:', err);
    failed++;
  }

  console.log(`\nR2 Client Test Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
