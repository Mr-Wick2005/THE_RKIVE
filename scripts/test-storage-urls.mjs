import {
  parseStorageReference,
  getStorageAssetUrl,
  getCoverUrl,
  getPageImageUrl,
  getPageThumbnailUrl,
} from '../lib/storage/urls.ts';

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ ${testName}\n    Expected: ${expected}\n    Actual:   ${actual}`);
  }
}

console.log('Testing Storage URL Resolver...\n');

// 1. Without NEXT_PUBLIC_R2_PUBLIC_URL set (Fallback mode)
process.env.NEXT_PUBLIC_R2_PUBLIC_URL = '';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://zeeomstjmbcnmxmhqcgs.supabase.co';

console.log('--- Mode 1: Fallback (Supabase URL mode) ---');

const legacyPageUrl =
  'https://zeeomstjmbcnmxmhqcgs.supabase.co/storage/v1/object/public/magazine-pages/dept1/mag1/pages/page-0001.webp';
assertEqual(
  getStorageAssetUrl(legacyPageUrl),
  legacyPageUrl,
  'Preserves legacy Supabase page URL when R2 is not configured'
);

const relativeCover = 'dept1/mag1/cover-123.jpg';
assertEqual(
  getCoverUrl(relativeCover),
  'https://zeeomstjmbcnmxmhqcgs.supabase.co/storage/v1/object/public/magazine-covers/dept1/mag1/cover-123.jpg',
  'Constructs Supabase URL for relative cover path when R2 is not configured'
);

const localAsset = '/placeholder-cover.jpg';
assertEqual(getStorageAssetUrl(localAsset), '/placeholder-cover.jpg', 'Preserves local asset path');

const restrictedPdf = 'dept1/mag1/original.pdf';
assertEqual(
  getStorageAssetUrl(restrictedPdf, { bucket: 'magazine-pdfs' }),
  'dept1/mag1/original.pdf',
  'Does not expose private PDF path through public URL'
);

// 2. With NEXT_PUBLIC_R2_PUBLIC_URL set (R2 Active mode)
console.log('\n--- Mode 2: Cloudflare R2 Active Mode ---');
process.env.NEXT_PUBLIC_R2_PUBLIC_URL = 'https://pub-abc123xyz.r2.dev';

assertEqual(
  getStorageAssetUrl(legacyPageUrl),
  'https://pub-abc123xyz.r2.dev/magazine-pages/dept1/mag1/pages/page-0001.webp',
  'Rewrites legacy Supabase page URL to Cloudflare R2 public URL'
);

const legacyCoverUrl =
  'https://zeeomstjmbcnmxmhqcgs.supabase.co/storage/v1/object/public/magazine-covers/dept1/mag1/cover-123.png';
assertEqual(
  getCoverUrl(legacyCoverUrl),
  'https://pub-abc123xyz.r2.dev/magazine-covers/dept1/mag1/cover-123.png',
  'Rewrites legacy Supabase cover URL to Cloudflare R2 public URL'
);

const legacyThumbUrl =
  'https://zeeomstjmbcnmxmhqcgs.supabase.co/storage/v1/object/public/magazine-pages/dept1/mag1/thumbnails/page-0001.webp';
assertEqual(
  getPageThumbnailUrl(legacyThumbUrl),
  'https://pub-abc123xyz.r2.dev/magazine-pages/dept1/mag1/thumbnails/page-0001.webp',
  'Rewrites legacy Supabase thumbnail URL to Cloudflare R2 public URL'
);

assertEqual(
  getPageImageUrl(legacyPageUrl),
  'https://pub-abc123xyz.r2.dev/magazine-pages/dept1/mag1/pages/page-0001.webp',
  'Rewrites legacy Supabase full page image URL via getPageImageUrl'
);

import { getCmsAssetUrl } from '../lib/storage/urls.ts';
const legacyCmsUrl =
  'https://zeeomstjmbcnmxmhqcgs.supabase.co/storage/v1/object/public/cms-assets/general/banner.webp';
assertEqual(
  getCmsAssetUrl(legacyCmsUrl),
  'https://pub-abc123xyz.r2.dev/cms-assets/general/banner.webp',
  'Rewrites legacy Supabase CMS asset URL to Cloudflare R2 public URL'
);

const relativeWithBucket = 'magazine-covers/dept1/mag1/cover-123.jpg';
assertEqual(
  getStorageAssetUrl(relativeWithBucket),
  'https://pub-abc123xyz.r2.dev/magazine-covers/dept1/mag1/cover-123.jpg',
  'Handles relative path with bucket prefix'
);

const relativeWithoutBucket = 'dept1/mag1/cover-123.jpg';
assertEqual(
  getCoverUrl(relativeWithoutBucket),
  'https://pub-abc123xyz.r2.dev/magazine-covers/dept1/mag1/cover-123.jpg',
  'Handles relative path without bucket prefix when bucket option is passed'
);

const alreadyR2Url = 'https://pub-abc123xyz.r2.dev/magazine-covers/dept1/mag1/cover-123.jpg';
assertEqual(
  getStorageAssetUrl(alreadyR2Url),
  'https://pub-abc123xyz.r2.dev/magazine-covers/dept1/mag1/cover-123.jpg',
  'Leaves already-formed R2 URL untouched'
);

// Restricted check in R2 mode
assertEqual(
  getStorageAssetUrl(restrictedPdf, { bucket: 'magazine-pdfs' }),
  'dept1/mag1/original.pdf',
  'Does not expose private PDF path in R2 mode'
);

// External URL check
const externalUrl = 'https://images.unsplash.com/photo-123';
assertEqual(
  getStorageAssetUrl(externalUrl),
  'https://images.unsplash.com/photo-123',
  'Preserves external third-party URL'
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
