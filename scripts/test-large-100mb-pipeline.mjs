import { STORAGE_LIMITS } from '../lib/config/upload-limits.ts';
import { validatePdfFile } from '../lib/storage/upload.ts';
import { validatePdfBuffer } from '../lib/pdf/validator.ts';

async function testLargePdfLimits() {
  console.log('--- TEST: 100MB BOUNDARY AND LARGE PDF HANDLING ---');

  // Check 1: 99 MB valid file size boundary
  console.log('\n[Check 1] 99 MB file boundary:');
  const file99Mb = { name: 'annual-report-2026.pdf', type: 'application/pdf', size: 99 * 1024 * 1024 };
  const res99 = validatePdfFile(file99Mb);
  console.log('99 MB result:', res99);
  if (!res99.valid) {
    throw new Error('FAIL: 99 MB file should be valid under 100MB ceiling.');
  }
  console.log('PASS: 99 MB file accepted within 100MB ceiling.');

  // Check 2: 101 MB file exceeding boundary
  console.log('\n[Check 2] 101 MB file boundary:');
  const file101Mb = { name: 'oversized-edition.pdf', type: 'application/pdf', size: 101 * 1024 * 1024 };
  const res101 = validatePdfFile(file101Mb);
  console.log('101 MB result:', res101);
  if (res101.valid) {
    throw new Error('FAIL: 101 MB file should have been rejected.');
  }
  console.log('PASS: 101 MB file correctly rejected with actionable error message.');

  // Check 3: Page count upper limit boundary
  console.log('\n[Check 3] Max page count boundary:');
  console.log(`Configured MAX_PDF_PAGE_COUNT: ${STORAGE_LIMITS.MAX_PDF_PAGE_COUNT}`);
  if (STORAGE_LIMITS.MAX_PDF_PAGE_COUNT !== 300) {
    throw new Error('FAIL: Expected 300 page operational boundary.');
  }
  console.log('PASS: Operational page limit is set to 300 pages.');

  console.log('\n=== LARGE PDF LIMIT TESTS PASSED ===\n');
}

testLargePdfLimits().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
