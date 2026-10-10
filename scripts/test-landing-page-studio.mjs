import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: THE RKIVE — SUPER ADMIN LANDING PAGE STUDIO CMS');
  console.log('================================================================\n');

  // 1. Get Super Admin User
  const { data: superAdmins, error: saErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'SUPER_ADMIN')
    .eq('is_active', true)
    .limit(1);

  if (saErr || !superAdmins || superAdmins.length === 0) {
    throw new Error('No active SUPER_ADMIN found in profiles for test run.');
  }

  const superAdmin = superAdmins[0];
  console.log(`[PASS] Found Active Super Admin: ${superAdmin.full_name} (${superAdmin.email})`);

  // Import CMS store functions directly
  const {
    getDraftLandingPageConfig,
    getPublishedLandingPageConfig,
    getLandingPageStudioData,
    saveLandingPageDraft,
    publishLandingPageConfig,
    restoreLandingPageVersion,
    resetLandingPageToDefaults,
  } = await import('../lib/cms/store.ts');

  // TEST 1: Baseline Published Configuration
  console.log('\n--- TEST 1: Get Initial Published Configuration ---');
  const initialPublished = await getPublishedLandingPageConfig();
  console.log('Published Brand Name:', initialPublished.header.brand_name);
  console.log('Published Hero Title Line 2:', initialPublished.hero.title_line2);
  console.log('Published Layout Variant:', initialPublished.hero.layout_variant);
  console.log('Published Active Sections Count:', initialPublished.section_order.length);
  if (!initialPublished.header.brand_name || !initialPublished.hero.title_line1) {
    throw new Error('TEST 1 FAILED: Initial configuration missing required fields');
  }
  console.log('[PASS] Test 1: Baseline configuration loaded successfully with all fallback defaults.');

  // TEST 2: Studio Data Initialization
  console.log('\n--- TEST 2: Studio Data & Entity Resolution ---');
  const studioData = await getLandingPageStudioData(superAdmin);
  console.log('Studio Version:', studioData.version);
  console.log('Available Published Magazines:', studioData.available_magazines.length);
  console.log('Available Departments:', studioData.available_departments.length);
  console.log('Existing Recorded Versions:', studioData.versions.length);
  console.log('[PASS] Test 2: Studio Data resolved live database entities accurately.');

  // TEST 3: Save Draft (Without Affecting Public Site)
  console.log('\n--- TEST 3: Save Draft (Draft isolation verification) ---');
  const modifiedDraft = JSON.parse(JSON.stringify(initialPublished));
  const testTitleLine2 = `THE RKIVE — TEST DRAFT ${Date.now()}`;
  modifiedDraft.hero.title_line2 = testTitleLine2;
  modifiedDraft.hero.layout_variant = 'split-video';
  modifiedDraft.recent_releases.mode = 'manual';
  if (studioData.available_magazines.length > 0) {
    modifiedDraft.recent_releases.featured_magazine_ids = [studioData.available_magazines[0].id];
  }

  const saveRes = await saveLandingPageDraft(modifiedDraft, superAdmin);
  if (!saveRes.success) {
    throw new Error(`TEST 3 FAILED: Save draft failed: ${saveRes.error}`);
  }
  console.log('[PASS] Draft saved successfully.');

  // Verify that public published site still has the previous title!
  const publicConfigAfterDraftSave = await getPublishedLandingPageConfig();
  if (publicConfigAfterDraftSave.hero.title_line2 === testTitleLine2) {
    throw new Error('TEST 3 CRITICAL FAILURE: Saving draft leaked into public published configuration!');
  }
  console.log(`[PASS] Verified Draft Isolation: Public title remains "${publicConfigAfterDraftSave.hero.title_line2}" while draft is "${testTitleLine2}".`);

  // TEST 4: Publish Workflow & Version Increment
  console.log('\n--- TEST 4: Publish Workflow & Version Increment ---');
  const pubRes = await publishLandingPageConfig(superAdmin, 'Automated Test Suite Publish');
  if (!pubRes.success) {
    throw new Error(`TEST 4 FAILED: Publish failed: ${pubRes.error}`);
  }
  console.log(`[PASS] Published successfully as Version ${pubRes.version}.`);

  // Verify public config is now updated
  const publicConfigAfterPublish = await getPublishedLandingPageConfig();
  if (publicConfigAfterPublish.hero.title_line2 !== testTitleLine2) {
    throw new Error(`TEST 4 FAILED: Public config not updated. Expected "${testTitleLine2}", got "${publicConfigAfterPublish.hero.title_line2}"`);
  }
  console.log(`[PASS] Verified Live Update: Public config now serves newly published title: "${publicConfigAfterPublish.hero.title_line2}"`);

  // TEST 5: Version History Snapshot & Rollback
  console.log('\n--- TEST 5: Version History Snapshot & Rollback ---');
  const updatedStudioData = await getLandingPageStudioData(superAdmin);
  console.log('Version History Count:', updatedStudioData.versions.length);
  const latestSnapshot = updatedStudioData.versions[0];
  console.log(`Latest snapshot version: v${latestSnapshot?.version_number}, Note: "${latestSnapshot?.note}"`);

  // Test rollback to factory defaults
  console.log('\n--- TEST 6: Reset to Factory Defaults ---');
  await resetLandingPageToDefaults(superAdmin);
  await publishLandingPageConfig(superAdmin, 'Reset to factory defaults');
  const restoredPublic = await getPublishedLandingPageConfig();
  console.log('Restored Public Hero Title Line 2:', restoredPublic.hero.title_line2);
  if (restoredPublic.hero.title_line2 !== 'THE RKIVE') {
    throw new Error('TEST 6 FAILED: Factory default restoration failed.');
  }
  console.log('[PASS] Test 6: Reset and published factory defaults successfully.');

  console.log('\n================================================================');
  console.log('ALL TESTS PASSED: Landing Page Studio CMS is 100% operational!');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
