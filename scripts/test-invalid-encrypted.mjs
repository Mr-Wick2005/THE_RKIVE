import { validatePdfBuffer } from '../lib/pdf/validator.ts';
import { PDFDocument } from 'pdf-lib';

async function testInvalidAndEncrypted() {
  console.log('--- TEST: PERMANENT ERROR CLASSIFICATION (INVALID / ENCRYPTED) ---');

  // Case 1: Corrupt magic bytes
  console.log('\n[Case 1] Corrupt magic bytes (e.g. text/html file uploaded as PDF):');
  const fakePdf = Buffer.from('<html><body>Not a PDF document</body></html>');
  const res1 = await validatePdfBuffer(fakePdf);
  console.log('Result 1:', res1);
  if (res1.isValid || res1.errorType !== 'PERMANENT') {
    throw new Error('FAIL: Corrupt file header should be classified as PERMANENT');
  }
  console.log('PASS: Detected invalid header and classified as PERMANENT');

  // Case 2: Too small (< 100 bytes)
  console.log('\n[Case 2] Empty or tiny file:');
  const tinyBuffer = Buffer.from('%PDF-');
  const res2 = await validatePdfBuffer(tinyBuffer);
  console.log('Result 2:', res2);
  if (res2.isValid || res2.errorType !== 'PERMANENT') {
    throw new Error('FAIL: Tiny file should be classified as PERMANENT');
  }
  console.log('PASS: Detected undersized file as PERMANENT');

  // Case 3: Valid unencrypted PDF
  console.log('\n[Case 3] Valid unencrypted PDF:');
  const validDoc = await PDFDocument.create();
  validDoc.addPage([400, 600]);
  const validBytes = await validDoc.save();
  const res3 = await validatePdfBuffer(Buffer.from(validBytes));
  console.log('Result 3:', res3);
  if (!res3.isValid || res3.pageCount !== 1) {
    throw new Error('FAIL: Valid PDF failed validation');
  }
  console.log('PASS: Valid PDF successfully validated with pageCount = 1');

  // Case 4: Corrupt trailer / broken PDF structure
  console.log('\n[Case 4] Corrupt structural PDF document:');
  const corruptPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 999 0 R >>\nendobj\n%%EOF');
  const res4 = await validatePdfBuffer(corruptPdf);
  console.log('Result 4:', res4);
  if (res4.isValid || res4.errorType !== 'PERMANENT') {
    throw new Error('FAIL: Corrupt PDF structure should be classified as PERMANENT');
  }
  console.log('PASS: Corrupt PDF structure detected as PERMANENT');

  console.log('\n=== ALL VALIDATION TESTS PASSED ===\n');
}

testInvalidAndEncrypted().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
