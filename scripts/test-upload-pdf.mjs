import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function main() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const env = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Testing PDF Upload to Supabase...');

  // Create a minimal 2-page test PDF in memory
  const pdfDoc = await PDFDocument.create();
  const p1 = pdfDoc.addPage([600, 800]);
  p1.drawText('Test Page 1 of Publication');
  const p2 = pdfDoc.addPage([600, 800]);
  p2.drawText('Test Page 2 of Publication');
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  console.log('Generated test PDF buffer size:', pdfBuffer.length);

  // Test 1: Upload with Service Role client
  console.log('\n--- TEST 1: Service Role Admin Client Upload ---');
  const adminClient = createClient(supabaseUrl, serviceKey);
  const testPath = `a0000000-0000-0000-0000-000000000001/test-mag-${Date.now()}/original.pdf`;

  const { data: adminUploadData, error: adminUploadErr } = await adminClient.storage
    .from('magazine-pdfs')
    .upload(testPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (adminUploadErr) {
    console.error('Admin Upload FAILED:', adminUploadErr);
  } else {
    console.log('Admin Upload SUCCESS:', adminUploadData);
  }

  // Test 2: Upload with Anon/Browser client (simulating client-side direct upload)
  console.log('\n--- TEST 2: Anon/Browser Client Upload ---');
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: anonUploadData, error: anonUploadErr } = await anonClient.storage
    .from('magazine-pdfs')
    .upload(`anon-test-${Date.now()}.pdf`, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (anonUploadErr) {
    console.error('Anon Upload FAILED (Expected if RLS restricts private bucket):', anonUploadErr.message);
  } else {
    console.log('Anon Upload SUCCESS:', anonUploadData);
  }

  // Test 3: Clean up test files
  await adminClient.storage.from('magazine-pdfs').remove([testPath]);
  console.log('\nCleaned up test file.');
}

main().catch((err) => console.error('FATAL:', err));
