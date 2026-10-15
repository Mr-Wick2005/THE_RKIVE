import { STORAGE_LIMITS } from '../lib/config/upload-limits.ts';
import { validatePdfFile } from '../lib/storage/upload.ts';
import { validatePdfBuffer } from '../lib/pdf/validator.ts';

async function testLargePdfLimits() {
  console.log('--- TEST: 50MB SUPABASE FREE PLAN BOUNDARY AND PDF HANDLING ---');

  // Check 1: 49 MB valid file size boundary
  console.log('\n[Check 1] 49 MB file boundary:');
  const file49Mb = { name: 'annual-report-2026.pdf', type: 'application/pdf', size: 49 * 1024 * 1024 };
  const res49 = validatePdfFile(file49Mb);
  console.log('49 MB result:', res49);
  if (!res49.valid) {
    throw new Error('FAIL: 49 MB file should be valid under 50MB Free tier ceiling.');
  }
  console.log('PASS: 49 MB file accepted within 50MB ceiling.');

  // Check 2: 51 MB file exceeding boundary
  console.log('\n[Check 2] 51 MB file boundary:');
  const file51Mb = { name: 'oversized-edition.pdf', type: 'application/pdf', size: 51 * 1024 * 1024 };
  const res51 = validatePdfFile(file51Mb);
  console.log('51 MB result:', res51);
  if (res51.valid) {
    throw new Error('FAIL: 51 MB file should have been rejected.');
  }
  console.log('PASS: 51 MB file correctly rejected with actionable error message.');

  // Check 3: Page count upper limit boundary
  console.log('\n[Check 3] Max page count boundary:');
  console.log(`Configured MAX_PDF_PAGE_COUNT: ${STORAGE_LIMITS.MAX_PDF_PAGE_COUNT}`);
  if (STORAGE_LIMITS.MAX_PDF_PAGE_COUNT !== 300) {
    throw new Error('FAIL: Expected 300 page operational boundary.');
  }
  console.log('PASS: Operational page limit is set to 300 pages.');

  console.log('\n=== 50MB FREE PLAN PDF LIMIT TESTS PASSED ===\n');
}

testLargePdfLimits().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
