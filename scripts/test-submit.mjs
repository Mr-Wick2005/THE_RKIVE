import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

async function testSubmitValidation() {
  console.log('--- Testing Submit Validation ---');
  const magazineId = '7a685967-b60a-48b7-912c-3fb6893f14a1';

  const { data: mag, error: fetchErr } = await supabase
    .from('magazines')
    .select('*')
    .eq('id', magazineId)
    .single();

  if (fetchErr || !mag) {
    console.error('Mag error:', fetchErr);
    process.exit(1);
  }

  console.log('Magazine state:', {
    title: mag.title,
    status: mag.status,
    processing_status: mag.processing_status,
    page_count: mag.page_count,
    original_pdf_url: mag.original_pdf_url,
  });

  const { count: pagesCount } = await supabase
    .from('magazine_pages')
    .select('*', { count: 'exact', head: true })
    .eq('magazine_id', magazineId);

  console.log(`Verified pages count in DB: ${pagesCount}`);

  // Test submitting
  if (mag.original_pdf_url && mag.processing_status === 'COMPLETED' && pagesCount > 0) {
    console.log('Validation passed! Transitioning status to SUBMITTED...');
    const { error: updateErr } = await supabase
      .from('magazines')
      .update({ status: 'SUBMITTED' })
      .eq('id', magazineId);

    if (updateErr) {
      console.error('Update error:', updateErr);
    } else {
      console.log('Successfully submitted magazine!');
    }
  } else {
    console.log('Validation FAILED!');
  }
}

testSubmitValidation().catch(console.error);
