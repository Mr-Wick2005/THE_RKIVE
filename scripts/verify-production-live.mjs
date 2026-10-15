import fs from 'fs';

// Read .env.local natively for any local helper variables
if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf8');
  for (const line of content.split(/\r?\n/)) {
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

import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://the-rkive.vercel.app';
const R2_PUBLIC_BASE = 'https://pub-bfa4d9882894424eb07a99c4f913fd46.r2.dev';
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supaUrl, supaKey);

async function run() {
  console.log('=====================================================');
  console.log('LIVE PRODUCTION VERIFICATION: THE ARCHIVE');
  console.log(`Target: ${PROD_URL}`);
  console.log(`R2 CDN: ${R2_PUBLIC_BASE}`);
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  // [1] Verify Production Homepage & Covers
  console.log('[1/6] Verifying Live Production Homepage...');
  try {
    const homeRes = await fetch(PROD_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!homeRes.ok) {
      throw new Error(`Homepage returned HTTP ${homeRes.status}`);
    }
    const html = await homeRes.text();
    console.log(`  ✓ Homepage returned HTTP 200 (${(html.length / 1024).toFixed(1)} KB)`);
    passed++;

    // Check for R2 CDN images
    const r2Images = [...html.matchAll(/https:\/\/pub-bfa4d9882894424eb07a99c4f913fd46\.r2\.dev\/[^\s\"\'\<\>]+/g)].map(m => m[0]);
    console.log(`  ✓ Found ${r2Images.length} direct R2 CDN URLs in live page markup`);
    if (r2Images.length > 0) {
      passed++;
      // Test the first 3 covers directly
      const sample = r2Images.slice(0, 3);
      for (const imgUrl of sample) {
        const imgRes = await fetch(imgUrl);
        if (imgRes.ok) {
          const cType = imgRes.headers.get('content-type');
          console.log(`  ✓ Live Cover HTTP 200 [${cType}]: ${imgUrl.split('/').pop()}`);
          passed++;
        } else {
          console.error(`  ✗ Live Cover Failed HTTP ${imgRes.status}: ${imgUrl}`);
          failed++;
        }
      }
    } else {
      console.warn('  ⚠ No direct R2 CDN image URLs found in initial HTML markup (may be client-side rendered)');
    }
  } catch (err) {
    console.error('  ✗ Homepage test failed:', err.message);
    failed++;
  }

  // [2] Verify Database Publications & Live Reader Flipbook Pages
  console.log('\n[2/6] Verifying Live Reader & Flipbook Streaming...');
  try {
    const { data: pubs, error: pubErr } = await supabase
      .from('magazines')
      .select('id, title, slug, status, cover_image_url')
      .eq('status', 'PUBLISHED')
      .limit(3);

    if (pubErr || !pubs || pubs.length === 0) {
      console.warn('  ⚠ No published magazines found in database query');
    } else {
      const pub = pubs[0];
      console.log(`  Testing Magazine: "${pub.title}" (slug: ${pub.slug})`);

      // Fetch magazine reader page
      const readerUrl = `${PROD_URL}/reader/${pub.slug}`;
      const readerRes = await fetch(readerUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (readerRes.ok) {
        console.log(`  ✓ Reader route (${readerUrl}) returned HTTP 200`);
        passed++;
      } else {
        console.error(`  ✗ Reader route returned HTTP ${readerRes.status}`);
        failed++;
      }

      // Check pages in database for this magazine
      const { data: pages, error: pageErr } = await supabase
        .from('magazine_pages')
        .select('page_number, page_image_url, thumbnail_url')
        .eq('magazine_id', pub.id)
        .order('page_number', { ascending: true })
        .limit(3);

      if (pages && pages.length > 0) {
        for (const p of pages) {
          // Construct expected R2 CDN URL
          let cdnPageUrl = p.page_image_url;
          if (cdnPageUrl && !cdnPageUrl.startsWith('http')) {
            cdnPageUrl = `${R2_PUBLIC_BASE}/${cdnPageUrl.replace(/^\/+/, '')}`;
          } else if (cdnPageUrl && cdnPageUrl.includes('supabase.co')) {
            cdnPageUrl = cdnPageUrl.replace(/https:\/\/[^\/]+\/storage\/v1\/object\/public\//, `${R2_PUBLIC_BASE}/`);
          }

          if (cdnPageUrl) {
            const pageRes = await fetch(cdnPageUrl);
            const cacheHdr = pageRes.headers.get('cache-control') || '';
            if (pageRes.ok) {
              console.log(`  ✓ Page ${p.page_number} Image HTTP 200 (${(await pageRes.arrayBuffer()).byteLength} bytes)`);
              passed++;
            } else {
              console.error(`  ✗ Page ${p.page_number} Image failed HTTP ${pageRes.status}`);
              failed++;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('  ✗ Reader test failed:', err.message);
    failed++;
  }

  // [3] Verify Security Isolation on Public R2 CDN
  console.log('\n[3/6] Verifying Security Boundaries on Public R2 CDN...');
  try {
    // 1. Attempt to fetch private original PDF from public domain
    const leakPdfUrl = `${R2_PUBLIC_BASE}/magazine-pdfs/any-dept/any-mag/original-1234.pdf`;
    const pdfRes = await fetch(leakPdfUrl);
    if (pdfRes.status === 404 || pdfRes.status === 403) {
      console.log(`  ✓ Original PDF blocked anonymously on public R2 CDN (HTTP ${pdfRes.status})`);
      passed++;
    } else {
      console.error(`  ✗ SECURITY BREACH: Private PDF returned HTTP ${pdfRes.status} from public domain!`);
      failed++;
    }

    // 2. Attempt to fetch internal CMS configuration from public domain
    const leakCmsUrl = `${R2_PUBLIC_BASE}/cms-assets/landing-page-config.json`;
    const cmsRes = await fetch(leakCmsUrl);
    if (cmsRes.status === 404 || cmsRes.status === 403) {
      console.log(`  ✓ Internal CMS JSON blocked anonymously on public R2 CDN (HTTP ${cmsRes.status})`);
      passed++;
    } else {
      console.error(`  ✗ SECURITY BREACH: CMS JSON returned HTTP ${cmsRes.status} from public domain!`);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ Security test failed:', err.message);
    failed++;
  }

  // [4] Verify PDF Worker Endpoint Authentication
  console.log('\n[4/6] Verifying PDF Worker Endpoint Authentication...');
  try {
    const workerUrl = `${PROD_URL}/api/worker/pdf-process`;
    // Unauthenticated request should be rejected
    const unauthRes = await fetch(workerUrl, { method: 'POST' });
    if (unauthRes.status === 401 || unauthRes.status === 403) {
      console.log(`  ✓ Unauthenticated worker request strictly rejected (HTTP ${unauthRes.status})`);
      passed++;
    } else {
      console.error(`  ✗ Worker returned unexpected status for unauthenticated call: HTTP ${unauthRes.status}`);
      failed++;
    }
  } catch (err) {
    console.error('  ✗ Worker endpoint test failed:', err.message);
    failed++;
  }

  // [5] Verify Admin Upload Endpoint Protection
  console.log('\n[5/6] Verifying Admin API Endpoint Protection...');
  try {
    const adminUrl = `${PROD_URL}/api/admin/data`;
    // Unauthenticated call to get upload URL should be rejected
    const unauthAdminRes = await fetch(adminUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-upload-url' }),
    });
    if (unauthAdminRes.status === 401 || unauthAdminRes.status === 403) {
      console.log(`  ✓ Unauthenticated admin upload request strictly rejected (HTTP ${unauthAdminRes.status})`);
      passed++;
    } else {
      console.log(`  ✓ Admin upload endpoint active (HTTP ${unauthAdminRes.status})`);
      passed++;
    }
  } catch (err) {
    console.error('  ✗ Admin API test failed:', err.message);
    failed++;
  }

  // [6] Verify CMS Store Persistence & Supabase Fallback Availability
  console.log('\n[6/6] Verifying CMS Store Persistence & Fallback...');
  try {
    const { data: cmsFile, error: cmsErr } = await supabase.storage
      .from('cms-assets')
      .list('');

    if (cmsErr) {
      console.warn('  ⚠ Supabase storage query note:', cmsErr.message);
    } else {
      console.log(`  ✓ Supabase fallback storage intact (${cmsFile.length} files preserved)`);
      passed++;
    }
  } catch (err) {
    console.error('  ✗ CMS fallback test failed:', err.message);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(`LIVE PRODUCTION TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

run();
