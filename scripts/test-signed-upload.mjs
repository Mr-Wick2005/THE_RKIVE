import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testSignedUpload() {
  console.log('Testing createSignedUploadUrl...');
  const testPath = `test/test-${Date.now()}.pdf`;
  const { data, error } = await supabase.storage
    .from('magazine-pdfs')
    .createSignedUploadUrl(testPath);

  if (error) {
    console.error('createSignedUploadUrl failed:', error);
  } else {
    console.log('createSignedUploadUrl success:', data);
  }
}

testSignedUpload().catch(console.error);
