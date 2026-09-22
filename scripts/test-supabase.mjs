import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zeeomstjmbcnmxmhqcgs.supabase.co';
const supabaseKey = 'sb_publishable_4iAa2OeUb0ixEUgD-vZXWA_ExHrWk9D';

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
