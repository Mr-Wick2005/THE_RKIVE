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

async function main() {
  console.log('Updating cms-assets bucket to allow application/json...');
  const { data: updateData, error: updateErr } = await supabase.storage.updateBucket('cms-assets', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4', 'application/json', 'text/plain'],
  });
  console.log('Update bucket result:', updateData, 'Error:', updateErr);

  console.log('Testing CMS Storage persistence in cms-assets bucket...');
  const testData = { test: true, timestamp: new Date().toISOString() };
  const buffer = Buffer.from(JSON.stringify(testData), 'utf8');

  // 1. Upload
  const { data: uploadData, error: upErr } = await supabase.storage
    .from('cms-assets')
    .upload('cms-test/persistence-check.json', buffer, {
      contentType: 'application/json',
      upsert: true,
    });

  if (upErr) {
    console.error('Upload Error:', upErr);
    return;
  }
  console.log('Upload OK:', uploadData);

  // 2. Download
  const { data: fileBlob, error: downErr } = await supabase.storage
    .from('cms-assets')
    .download('cms-test/persistence-check.json');

  if (downErr) {
    console.error('Download Error:', downErr);
    return;
  }

  const text = await fileBlob.text();
  console.log('Downloaded file contents:', text);
  console.log('PERSISTENCE IN SUPABASE STORAGE CONFIRMED!');
}

main().catch(console.error);
