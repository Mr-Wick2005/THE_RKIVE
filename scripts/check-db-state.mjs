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

async function checkDatabaseState() {
  console.log('--- Inspecting Database State ---');

  // Check magazine
  const { data: magazines, error: magErr } = await supabase
    .from('magazines')
    .select('id, title, slug, department_id, status, processing_status, page_count, original_pdf_url, cover_image_url')
    .order('created_at', { ascending: false });

  console.log('Magazines in DB:');
  console.table(magazines);

  // Check pages
  const { data: pages, error: pageErr } = await supabase
    .from('magazine_pages')
    .select('id, magazine_id, page_number, width, height, mime_type, image_path, thumbnail_path')
    .order('page_number', { ascending: true });

  console.log('Pages in DB:');
  console.table(pages);
}

checkDatabaseState().catch(console.error);
