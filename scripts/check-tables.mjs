import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function check() {
  const tables = [
    'profiles',
    'departments',
    'magazines',
    'magazine_pages',
    'magazine_views',
    'magazine_status_history',
    'pdf_processing_jobs',
    'homepage_configs',
    'homepage_versions',
    'cms_media',
    'settings',
    'site_settings',
    'system_settings',
  ];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    console.log(t, '->', error ? 'ERROR: ' + error.message : 'EXISTS (rows: ' + (data ? data.length : 0) + ')');
  }

  console.log('\n--- CHECKING TABLE COLUMNS ---');
  for (const t of ['departments', 'magazines', 'profiles']) {
    const { data } = await supabase.from(t).select('*').limit(1);
    if (data && data[0]) {
      console.log(t, 'columns:', Object.keys(data[0]));
    }
  }
}

check().catch(console.error);
