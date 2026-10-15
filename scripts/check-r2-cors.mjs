import fs from 'fs';

// Read .env.local natively
if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { getR2Client } from '../lib/storage/r2.ts';
import { GetBucketCorsCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';

async function checkAndApplyCors() {
  const client = getR2Client();
  const buckets = ['magazine-files-public', 'magazine-files-private'];

  const corsRules = [
    {
      AllowedOrigins: ['*'],
      AllowedMethods: ['GET', 'PUT', 'HEAD', 'POST'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ];

  for (const bucket of buckets) {
    try {
      console.log(`Setting CORS for ${bucket}...`);
      await client.send(new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: { CORSRules: corsRules },
      }));
      console.log(`✓ Successfully set CORS for ${bucket}`);

      const res = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
      console.log(`✓ Verified CORS for ${bucket}:`, JSON.stringify(res.CORSRules));
    } catch (err) {
      console.log(`Error with CORS on ${bucket}: ${err.name} - ${err.message}`);
    }
  }
}

checkAndApplyCors();

