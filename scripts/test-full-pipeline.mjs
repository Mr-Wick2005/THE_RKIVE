import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('--- Testing Full PDF Pipeline ---');

  // 1. Generate a valid 3-page test PDF in memory
  console.log('1. Creating test 3-page PDF...');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= 3; i++) {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText(`INNOVATE INSIGHT - PAGE ${i}`, {
      x: 50,
      y: 700,
      size: 24,
      font,
      color: rgb(0.1, 0.2, 0.4),
    });
    page.drawText(`Department of Computer Engineering - Academic Year 2025-2026`, {
      x: 50,
      y: 650,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  console.log(`Generated PDF buffer size: ${pdfBuffer.length} bytes`);

  // 2. Fetch the target magazine ("Innovate Insight")
  const { data: magazine, error: magErr } = await supabase
    .from('magazines')
    .select('*')
    .eq('slug', 'innovate-insight')
    .single();

  if (magErr || !magazine) {
    console.error('Failed to find magazine "innovate-insight":', magErr);
    process.exit(1);
  }

  console.log(`Found magazine: ${magazine.title} (ID: ${magazine.id}, Dept: ${magazine.department_id})`);

  // 3. Upload PDF to 'magazine-pdfs' bucket
  const storagePath = `${magazine.department_id}/${magazine.id}/original-${Date.now()}.pdf`;
  console.log(`3. Uploading PDF to magazine-pdfs at path: ${storagePath}...`);

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('magazine-pdfs')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadErr) {
    console.error('Upload to magazine-pdfs failed:', uploadErr);
    process.exit(1);
  }
  console.log('PDF upload successful:', uploadData);

  // 4. Update magazine record with original_pdf_url
  const { error: updateErr } = await supabase
    .from('magazines')
    .update({
      original_pdf_url: storagePath,
      processing_status: 'QUEUED',
      processing_error: null,
    })
    .eq('id', magazine.id);

  if (updateErr) {
    console.error('Failed to update magazine record:', updateErr);
    process.exit(1);
  }
  console.log('Updated magazine original_pdf_url and status to QUEUED.');

  console.log('Now we will import and test the actual processMagazinePdf function.');
}

main().catch(console.error);
