import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env.local dynamically
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
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('--- Testing Live Supabase Project ---');
  console.log('URL:', supabaseUrl);

  // 1. Test Departments table
  console.log('\n1. Testing `departments` table...');
  const { data: depts, error: deptErr } = await supabase.from('departments').select('*').limit(5);
  if (deptErr) {
    console.error('❌ Departments query failed:', deptErr.message);
  } else {
    console.log(`✅ Departments query SUCCESS. Found ${depts?.length} rows.`);
    console.log('Departments sample:', depts);
  }

  // 2. Test Magazines table
  console.log('\n2. Testing `magazines` table...');
  const { data: mags, error: magErr } = await supabase.from('magazines').select('*').limit(5);
  if (magErr) {
    console.error('❌ Magazines query failed:', magErr.message);
  } else {
    console.log(`✅ Magazines query SUCCESS. Found ${mags?.length} rows.`);
    console.log('Magazines sample:', mags);
  }

  // 3. Test Magazine Pages table
  console.log('\n3. Testing `magazine_pages` table...');
  const { data: pages, error: pagesErr } = await supabase.from('magazine_pages').select('*').limit(5);
  if (pagesErr) {
    console.error('❌ Magazine Pages query failed:', pagesErr.message);
  } else {
    console.log(`✅ Magazine Pages query SUCCESS. Found ${pages?.length} rows.`);
  }

  // 4. Test Magazine Status History table
  console.log('\n4. Testing `magazine_status_history` table...');
  const { data: hist, error: histErr } = await supabase.from('magazine_status_history').select('*').limit(5);
  if (histErr) {
    console.error('❌ Magazine Status History query failed:', histErr.message);
  } else {
    console.log(`✅ Magazine Status History query SUCCESS. Found ${hist?.length} rows.`);
  }

  // 5. Test Profiles table
  console.log('\n5. Testing `profiles` table...');
  const { data: profs, error: profsErr } = await supabase.from('profiles').select('*').limit(5);
  if (profsErr) {
    console.error('❌ Profiles query failed:', profsErr.message);
  } else {
    console.log(`✅ Profiles query SUCCESS. Found ${profs?.length} rows.`);
  }

  // 6. Test Storage Buckets
  console.log('\n6. Testing Storage buckets...');
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  if (bucketErr) {
    console.error('❌ Storage listBuckets failed:', bucketErr.message);
  } else {
    console.log('✅ Storage listBuckets SUCCESS. Buckets found:', buckets?.map((b) => b.name));
  }
}

runTests();
