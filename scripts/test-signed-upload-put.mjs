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

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const supabaseAnon = createClient(supabaseUrl, anonKey);

async function testSignedUpload() {
  console.log('Testing createSignedUploadUrl...');
  const testPath = `test-dept/test-mag-${Date.now()}/source.pdf`;
  const { data: signData, error: signError } = await supabaseAdmin.storage
    .from('magazine-pdfs')
    .createSignedUploadUrl(testPath);

  if (signError) {
    console.error('Sign error:', signError);
    return;
  }
  console.log('Sign data:', signData);

  const testBuffer = Buffer.from('%PDF-1.4 test dummy content');

  console.log('\nTesting Method A: fetch PUT directly to signedUrl...');
  const res = await fetch(signData.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: testBuffer,
  });
  console.log('Method A status:', res.status, res.statusText);
  if (!res.ok) {
    const text = await res.text();
    console.log('Method A response text:', text);
  }

  console.log('\nTesting Method B: supabase.storage.uploadToSignedUrl...');
  const { data: bData, error: bError } = await supabaseAnon.storage
    .from('magazine-pdfs')
    .uploadToSignedUrl(signData.path, signData.token, testBuffer, {
      contentType: 'application/pdf',
    });
  console.log('Method B result:', bData, 'error:', bError);
}

testSignedUpload().catch(console.error);
