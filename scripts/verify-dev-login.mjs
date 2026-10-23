import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
let supabaseUrl = '';
let supabaseAnonKey = '';
let serviceRoleKey = '';

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
  }
} catch (e) {
  console.error('Failed to read .env.local');
  process.exit(1);
}

// Read credentials
const credsFile = path.resolve(process.cwd(), '.dev-credentials.local');
if (!fs.existsSync(credsFile)) {
  console.error('Missing .dev-credentials.local. Run node scripts/generate-dev-credentials.mjs first.');
  process.exit(1);
}

const credsContent = fs.readFileSync(credsFile, 'utf8');
const saEmail = credsContent.match(/SUPER_ADMIN_EMAIL=([^\r\n]+)/)?.[1]?.trim();
const saPass = credsContent.match(/SUPER_ADMIN_PASSWORD=([^\r\n]+)/)?.[1]?.trim();
const daEmail = credsContent.match(/DEPT_ADMIN_EMAIL=([^\r\n]+)/)?.[1]?.trim();
const daPass = credsContent.match(/DEPT_ADMIN_PASSWORD=([^\r\n]+)/)?.[1]?.trim();

async function verifyLogins() {
  console.log('================================================================');
  console.log('  THE RKIVE — LIVE DEVELOPMENT ADMIN LOGIN VERIFICATION        ');
  console.log('================================================================');
  console.log(`Target URL:  ${supabaseUrl}`);
  console.log(`Anon Key:    Configured (${supabaseAnonKey.slice(0, 15)}...)`);
  console.log('----------------------------------------------------------------\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Verify Super Admin Sign In
  console.log(`[1/2] Testing Super Admin: ${saEmail}...`);
  try {
    const { data: saData, error: saAuthErr } = await supabase.auth.signInWithPassword({
      email: saEmail,
      password: saPass,
    });

    if (saAuthErr) {
      console.log(`  ❌ Auth failed: ${saAuthErr.message}`);
      console.log('     NOTE: If the database has not been initialized yet, run `supabase/development_setup.sql` in the Supabase SQL Editor.');
    } else {
      console.log(`  ✅ Auth SUCCESS (User ID: ${saData.user.id})`);

      // Verify Profile
      const { data: saProf, error: saProfErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', saData.user.id)
        .single();

      if (saProfErr) {
        console.log(`  ❌ Profile query failed: ${saProfErr.message}`);
      } else {
        console.log(`  ✅ Profile SUCCESS: role=${saProf.role}, is_active=${saProf.is_active}`);
      }
    }
  } catch (err) {
    console.error('  Unexpected Super Admin error:', err.message);
  }

  // 2. Verify Department Admin Sign In
  console.log(`\n[2/2] Testing Department Admin: ${daEmail}...`);
  try {
    const { data: daData, error: daAuthErr } = await supabase.auth.signInWithPassword({
      email: daEmail,
      password: daPass,
    });

    if (daAuthErr) {
      console.log(`  ❌ Auth failed: ${daAuthErr.message}`);
    } else {
      console.log(`  ✅ Auth SUCCESS (User ID: ${daData.user.id})`);

      // Verify Profile & Department
      const { data: daProf, error: daProfErr } = await supabase
        .from('profiles')
        .select('*, department:departments(*)')
        .eq('id', daData.user.id)
        .single();

      if (daProfErr) {
        console.log(`  ❌ Profile query failed: ${daProfErr.message}`);
      } else {
        console.log(`  ✅ Profile SUCCESS: role=${daProf.role}, dept=${daProf.department?.name || daProf.department_id}, is_active=${daProf.is_active}`);
      }
    }
  } catch (err) {
    console.error('  Unexpected Department Admin error:', err.message);
  }

  console.log('\n================================================================');
}

verifyLogins().catch(console.error);
