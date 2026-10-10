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

async function testApiCreate() {
  console.log('Testing create-publication via route handler logic directly...');

  const { POST } = await import('../app/api/admin/data/route.ts');
  const { data: depts } = await supabase.from('departments').select('*').limit(1);
  const dept = depts[0];

  // Create a JWT or service token test request
  const customId = `00000000-0000-4000-a000-${Date.now().toString(16).slice(0, 12)}d`;

  // Simulate authenticated request
  // Let's create a test user session token or mock token using auth.admin
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const testUser = users[0];
  console.log('Test User:', testUser.email, 'ID:', testUser.id);

  // Generate a direct link or session token
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: testUser.email,
  });

  const { data: sessionData } = await supabase.auth.verifyOtp({
    email: testUser.email,
    token: linkData.properties.email_otp,
    type: 'email',
  });

  const token = sessionData?.session?.access_token;
  console.log('Obtained real access token:', Boolean(token));

  const req = new Request('http://localhost:3000/api/admin/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'create-publication',
      id: customId,
      title: 'Computer Readers Newsletter Edition 2026',
      academic_year: '2025-2026',
      department_id: dept.id,
      original_pdf_url: `${dept.id}/${customId}/source.pdf`,
      cover_image_url: 'https://example.com/cover.jpg',
    }),
  });

  const res = await POST(req);
  console.log('Response Status:', res.status);
  const json = await res.json();
  console.log('Response JSON:', json);

  if (json.success) {
    console.log('✓ create-publication API created magazine successfully!');
    // Clean up
    await supabase.from('magazines').delete().eq('id', customId);
    console.log('✓ Cleaned up test record.');
  } else {
    throw new Error(`API failed: ${JSON.stringify(json)}`);
  }
}

testApiCreate().catch(console.error);
