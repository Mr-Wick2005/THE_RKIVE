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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testCreateMagazine() {
  console.log('--- Testing createMagazineAction Flow ---');

  // 1. Get a department and profile
  const { data: depts } = await supabase.from('departments').select('*').limit(1);
  const { data: profiles } = await supabase.from('profiles').select('*').limit(1);

  const dept = depts[0];
  const profile = profiles[0];
  console.log('Department:', dept.name, 'ID:', dept.id);
  console.log('Profile:', profile.email, 'Role:', profile.role, 'ID:', profile.id);

  // 2. Import createMagazineAction
  const { createMagazineAction } = await import('../app/actions/magazines.ts');

  // Mock formData
  const formData = new FormData();
  formData.set('title', 'Computer Readers Newsletter');
  formData.set('subtitle', '');
  formData.set('description', '');
  formData.set('academic_year', '2025-2026');
  formData.set('edition', '');
  formData.set('volume', '');
  formData.set('issue', '');
  formData.set('page_count', '0');
  formData.set('submit_now', 'false');
  formData.set('department_id', dept.id);
  formData.set('id', `00000000-0000-4000-a000-${Date.now().toString(16).padStart(12, '0')}`);
  formData.set('original_pdf_url', `${dept.id}/test-mag/source.pdf`);
  formData.set('cover_image_url', 'https://example.com/cover.jpg');

  // Note: createMagazineAction checks token via getCurrentProfile(token)
  // If token is missing, let's see what happens!
  console.log('\nCase A: Submitting without access_token...');
  const resA = await createMagazineAction(formData);
  console.log('Result A:', resA);

  // If we simulate an admin session:
  // Let's create an auth user session or sign in
  console.log('\nCase B: Signing in as editorial admin to get real session access_token...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: profile.email || 'admin@rkive.edu',
    password: 'password123',
  }).catch(() => ({ data: null, error: 'Sign in failed' }));

  if (authData?.session?.access_token) {
    formData.set('access_token', authData.session.access_token);
    const resB = await createMagazineAction(formData);
    console.log('Result B:', resB);
  } else {
    console.log('Could not sign in with password, checking profiles and tokens in DB...');
  }
}

testCreateMagazine().catch(console.error);
