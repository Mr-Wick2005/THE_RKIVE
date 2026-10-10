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

async function runExactSimulation() {
  console.log('=== TESTING EXACT FORM SUBMISSION WORKFLOW ===');

  // 1. Fetch department 'Computer Engineering'
  const { data: dept } = await supabase
    .from('departments')
    .select('*')
    .eq('name', 'Computer Engineering')
    .single();

  console.log('Target Department:', dept.name, 'ID:', dept.id);

  // 2. Fetch all profiles
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Available Profiles:');
  console.table(profiles);

  for (const p of profiles) {
    console.log(`\nTesting with profile ${p.email} (${p.role})...`);

    // Let's test createMagazineAction directly with this profile's ID
    const { createAdminClient } = await import('../lib/supabase/admin.ts');
    const { generateUniqueMagazineSlug } = await import('../lib/magazines/admin.ts');

    const testMagId = `00000000-0000-4000-a000-${Date.now().toString(16).slice(0, 12)}f`;
    const title = 'Computer Readers Newsletter Test';
    const slug = await generateUniqueMagazineSlug(title);
    console.log('Generated slug:', slug);

    const insertPayload = {
      id: testMagId,
      title,
      subtitle: null,
      description: null,
      academic_year: '2025-2026',
      edition: null,
      volume: null,
      issue: null,
      page_count: 0,
      slug,
      department_id: dept.id,
      created_by: p.id,
      status: 'DRAFT',
      processing_status: 'QUEUED',
      cover_image_url: 'https://zeeomstjmbcnmxmhqcgs.supabase.co/storage/v1/object/public/magazine-covers/test.jpg',
      original_pdf_url: `${dept.id}/${testMagId}/original.pdf`,
    };

    console.log('Attempting insert into magazines table...');
    const { data: inserted, error: insErr } = await supabase
      .from('magazines')
      .insert(insertPayload)
      .select('id, slug')
      .single();

    if (insErr) {
      console.error(`❌ INSERT FAILED for profile ${p.email}:`, insErr);
    } else {
      console.log(`✓ INSERT SUCCESS for profile ${p.email}:`, inserted);
      // Clean up
      await supabase.from('magazines').delete().eq('id', testMagId);
    }
  }
}

runExactSimulation().catch(console.error);
