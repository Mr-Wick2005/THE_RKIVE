import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function diagnose() {
  console.log('=== PROFILES IN DATABASE ===');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.table(profiles);

  console.log('=== DEPARTMENTS IN DATABASE ===');
  const { data: depts, error: dErr } = await supabase.from('departments').select('*');
  console.table(depts);

  console.log('=== RECENT MAGAZINES IN DATABASE ===');
  const { data: mags, error: mErr } = await supabase.from('magazines').select('id, title, slug, status, processing_status, created_at, department_id, created_by').order('created_at', { ascending: false }).limit(5);
  console.table(mags);
}

diagnose().catch(console.error);
