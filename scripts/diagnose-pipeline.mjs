import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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
  const serviceKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('--- SUPABASE CONFIGURATION ---');
  console.log('URL:', supabaseUrl);
  console.log('Has Service Key:', Boolean(serviceKey));
  console.log('Service Key Prefix:', serviceKey ? serviceKey.substring(0, 8) + '...' : 'NONE');

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Query magazines table
  console.log('\n--- MAGAZINES IN DATABASE ---');
  const { data: magazines, error: magError } = await supabase
    .from('magazines')
    .select('id, title, slug, status, processing_status, processing_error, page_count, original_pdf_url, cover_image_url, department_id, updated_at');
  
  if (magError) {
    console.error('Error querying magazines:', magError);
  } else {
    console.log(JSON.stringify(magazines, null, 2));
  }

  // 2. Query storage buckets
  console.log('\n--- STORAGE BUCKETS ---');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error('Error querying buckets:', bucketError);
  } else {
    console.log(buckets.map((b) => ({ name: b.name, id: b.id, public: b.public })));
  }

  // 3. For each magazine, inspect its files in storage
  if (magazines && magazines.length > 0) {
    for (const mag of magazines) {
      console.log(`\n--- ASSETS FOR MAGAZINE "${mag.title}" (${mag.id}) ---`);
      console.log('original_pdf_url:', mag.original_pdf_url);
      console.log('processing_status:', mag.processing_status);
      console.log('page_count:', mag.page_count);

      const deptId = mag.department_id;
      const folderPrefix = `${deptId}/${mag.id}`;

      // Check pdf
      const { data: pdfFiles, error: pdfListErr } = await supabase.storage
        .from('magazine-pdfs')
        .list(folderPrefix);
      console.log('PDF bucket folder contents:', pdfFiles || pdfListErr);

      // Check pages
      const { data: pageFiles, error: pageListErr } = await supabase.storage
        .from('magazine-pages')
        .list(`${folderPrefix}/pages`);
      console.log(`Pages count in storage (${folderPrefix}/pages):`, pageFiles ? pageFiles.length : pageListErr);

      // Check magazine_pages rows
      const { data: pageRows, error: pageRowsErr } = await supabase
        .from('magazine_pages')
        .select('page_number, image_path, thumbnail_path')
        .eq('magazine_id', mag.id)
        .order('page_number', { ascending: true });
      console.log(`DB magazine_pages count:`, pageRows ? pageRows.length : pageRowsErr);
    }
  }
}

main().catch((err) => console.error('FATAL:', err));
