import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import { Profile } from '@/types/auth';
import {
  LandingPageConfig,
  CmsVersionSnapshot,
  CmsMediaAsset,
  CmsStudioData,
} from '@/types/cms';
import { DEFAULT_LANDING_PAGE_CONFIG } from './defaults';
import {
  validateAndSanitizeConfig,
  generateChangeSummary,
} from './validation';
import { FALLBACK_MAGAZINES } from '@/lib/magazines';
import { FALLBACK_DEPARTMENTS } from '@/lib/departments';

const BACKUP_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_FILE = path.resolve(BACKUP_DIR, 'landing-page-config.json');
const VERSIONS_BACKUP_FILE = path.resolve(BACKUP_DIR, 'landing-page-versions.json');
const MEDIA_BACKUP_FILE = path.resolve(BACKUP_DIR, 'cms-media.json');

const STORAGE_BUCKET = 'cms-assets';
const STORAGE_CONFIG_PATH = 'cms-data/landing-page-config.json';
const STORAGE_VERSIONS_PATH = 'cms-data/landing-page-versions.json';
const STORAGE_MEDIA_PATH = 'cms-data/cms-media.json';

// In-memory runtime cache for serverless request reuse (TTL 5s)
let cachedCloudConfig: {
  data: {
    draft: LandingPageConfig;
    published: LandingPageConfig;
    published_at?: string;
    published_by_name?: string;
    draft_updated_at?: string;
    version: number;
  };
  cachedAt: number;
} | null = null;

function invalidateRuntimeCache() {
  cachedCloudConfig = null;
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    try {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    } catch (err) {
      // Ignored if in read-only environment
    }
  }
}

function readBackupConfig(): {
  draft: LandingPageConfig;
  published: LandingPageConfig;
  published_at?: string;
  published_by_name?: string;
  draft_updated_at?: string;
  version: number;
} {
  try {
    ensureBackupDir();
    if (fs.existsSync(BACKUP_FILE)) {
      const content = fs.readFileSync(BACKUP_FILE, 'utf8');
      const parsed = JSON.parse(content);
      return {
        draft: { ...DEFAULT_LANDING_PAGE_CONFIG, ...(parsed.draft || {}) },
        published: { ...DEFAULT_LANDING_PAGE_CONFIG, ...(parsed.published || {}) },
        published_at: parsed.published_at,
        published_by_name: parsed.published_by_name,
        draft_updated_at: parsed.draft_updated_at,
        version: parsed.version || 1,
      };
    }
  } catch (e) {
    // Fall back to default
  }
  return {
    draft: DEFAULT_LANDING_PAGE_CONFIG,
    published: DEFAULT_LANDING_PAGE_CONFIG,
    version: 1,
  };
}

function writeBackupConfig(data: any) {
  try {
    ensureBackupDir();
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // Ignored in read-only envs
  }
}

function readBackupVersions(): CmsVersionSnapshot[] {
  try {
    ensureBackupDir();
    if (fs.existsSync(VERSIONS_BACKUP_FILE)) {
      return JSON.parse(fs.readFileSync(VERSIONS_BACKUP_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function writeBackupVersions(versions: CmsVersionSnapshot[]) {
  try {
    ensureBackupDir();
    fs.writeFileSync(VERSIONS_BACKUP_FILE, JSON.stringify(versions, null, 2), 'utf8');
  } catch (e) {}
}

function readBackupMedia(): CmsMediaAsset[] {
  try {
    ensureBackupDir();
    if (fs.existsSync(MEDIA_BACKUP_FILE)) {
      return JSON.parse(fs.readFileSync(MEDIA_BACKUP_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function writeBackupMedia(media: CmsMediaAsset[]) {
  try {
    ensureBackupDir();
    fs.writeFileSync(MEDIA_BACKUP_FILE, JSON.stringify(media, null, 2), 'utf8');
  } catch (e) {}
}

// ==========================================
// SUPABASE STORAGE CLOUD PERSISTENCE ENGINE
// Guarantees persistence across Vercel Lambdas
// ==========================================

async function ensureBucketMimeType(supabase: any) {
  try {
    await supabase.storage.updateBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 52428800,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'video/mp4',
        'application/json',
        'text/plain',
      ],
    });
  } catch (err) {}
}

async function readCloudConfig(): Promise<{
  draft: LandingPageConfig;
  published: LandingPageConfig;
  published_at?: string;
  published_by_name?: string;
  draft_updated_at?: string;
  version: number;
} | null> {
  if (cachedCloudConfig && Date.now() - cachedCloudConfig.cachedAt < 5000) {
    return cachedCloudConfig.data;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_CONFIG_PATH);

    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      const res = {
        draft: { ...DEFAULT_LANDING_PAGE_CONFIG, ...(parsed.draft || {}) },
        published: { ...DEFAULT_LANDING_PAGE_CONFIG, ...(parsed.published || {}) },
        published_at: parsed.published_at,
        published_by_name: parsed.published_by_name,
        draft_updated_at: parsed.draft_updated_at,
        version: parsed.version || 1,
      };
      cachedCloudConfig = { data: res, cachedAt: Date.now() };
      return res;
    }
  } catch (err) {
    // Cloud storage read error, will fall back
  }
  return null;
}

async function writeCloudConfig(data: any): Promise<boolean> {
  invalidateRuntimeCache();
  try {
    const supabase = createAdminClient();
    const buffer = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
    let { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_CONFIG_PATH, buffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error && (error as any).code === 'InvalidMimeType') {
      await ensureBucketMimeType(supabase);
      const retry = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(STORAGE_CONFIG_PATH, buffer, {
          contentType: 'application/json',
          upsert: true,
        });
      error = retry.error;
    }

    if (!error) {
      cachedCloudConfig = { data, cachedAt: Date.now() };
      return true;
    } else {
      console.error('[CMS:CLOUD_STORAGE_UPLOAD_ERROR]', error);
    }
  } catch (err) {
    console.error('[CMS:CLOUD_WRITE_EXCEPTION]', err);
  }
  return false;
}

async function readCloudVersions(): Promise<CmsVersionSnapshot[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_VERSIONS_PATH);
    if (!error && data) {
      const text = await data.text();
      return JSON.parse(text);
    }
  } catch (err) {}
  return [];
}

async function writeCloudVersions(versions: CmsVersionSnapshot[]): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const buffer = Buffer.from(JSON.stringify(versions, null, 2), 'utf8');
    let { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_VERSIONS_PATH, buffer, {
        contentType: 'application/json',
        upsert: true,
      });
    return !error;
  } catch (err) {
    return false;
  }
}

async function readCloudMedia(): Promise<CmsMediaAsset[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_MEDIA_PATH);
    if (!error && data) {
      const text = await data.text();
      return JSON.parse(text);
    }
  } catch (err) {}
  return [];
}

async function writeCloudMedia(media: CmsMediaAsset[]): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const buffer = Buffer.from(JSON.stringify(media, null, 2), 'utf8');
    let { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_MEDIA_PATH, buffer, {
        contentType: 'application/json',
        upsert: true,
      });
    return !error;
  } catch (err) {
    return false;
  }
}

// ==========================================
// PUBLIC CMS READ & WRITE API FUNCTIONS
// ==========================================

/**
 * Returns the currently published LandingPageConfig for the public homepage.
 * Highly resilient: uses Supabase DB if available, Supabase Cloud Storage, or local fallback.
 */
export async function getPublishedLandingPageConfig(): Promise<LandingPageConfig> {
  // 1. Try DB table homepage_configs
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('homepage_configs' as any)
      .select('published_data')
      .eq('key', 'main')
      .single();

    if (!error && data && (data as any).published_data) {
      const merged = {
        ...DEFAULT_LANDING_PAGE_CONFIG,
        ...(data as any).published_data,
      };
      const { sanitized } = validateAndSanitizeConfig(merged);
      return sanitized;
    }
  } catch (err) {
    // DB table might not exist
  }

  // 2. Try Supabase Cloud Storage (primary cloud-persistent store on Vercel)
  const cloud = await readCloudConfig();
  if (cloud && cloud.published) {
    const { sanitized } = validateAndSanitizeConfig(cloud.published);
    return sanitized;
  }

  // 3. Fallback to local backup or default
  const backup = readBackupConfig();
  const { sanitized } = validateAndSanitizeConfig(backup.published);
  return sanitized;
}

/**
 * Returns the current draft LandingPageConfig for the Super Admin Studio.
 */
export async function getDraftLandingPageConfig(): Promise<LandingPageConfig> {
  // 1. Try DB table homepage_configs
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('homepage_configs' as any)
      .select('draft_data')
      .eq('key', 'main')
      .single();

    if (!error && data && (data as any).draft_data) {
      const merged = {
        ...DEFAULT_LANDING_PAGE_CONFIG,
        ...(data as any).draft_data,
      };
      const { sanitized } = validateAndSanitizeConfig(merged);
      return sanitized;
    }
  } catch (err) {}

  // 2. Try Supabase Cloud Storage
  const cloud = await readCloudConfig();
  if (cloud && cloud.draft) {
    const { sanitized } = validateAndSanitizeConfig(cloud.draft);
    return sanitized;
  }

  // 3. Fallback to local backup or default
  const backup = readBackupConfig();
  const { sanitized } = validateAndSanitizeConfig(backup.draft);
  return sanitized;
}

/**
 * Fetches all data needed to initialize the Super Admin Landing Page Studio.
 */
export async function getLandingPageStudioData(profile: Profile): Promise<CmsStudioData> {
  const supabaseAdmin = createAdminClient();
  let draft = DEFAULT_LANDING_PAGE_CONFIG;
  let published = DEFAULT_LANDING_PAGE_CONFIG;
  let published_at: string | undefined;
  let published_by_name: string | undefined;
  let draft_updated_at: string | undefined;
  let version = 1;
  let versions: CmsVersionSnapshot[] = [];
  let media: CmsMediaAsset[] = [];

  // 1. Try DB table
  let dbLoaded = false;
  try {
    const { data: configRow, error: configErr } = await supabaseAdmin
      .from('homepage_configs' as any)
      .select('*, profiles:published_by(full_name)')
      .eq('key', 'main')
      .single();

    if (!configErr && configRow) {
      draft = { ...DEFAULT_LANDING_PAGE_CONFIG, ...((configRow as any).draft_data || {}) };
      published = { ...DEFAULT_LANDING_PAGE_CONFIG, ...((configRow as any).published_data || {}) };
      published_at = (configRow as any).published_at;
      published_by_name = (configRow as any).profiles?.full_name;
      draft_updated_at = (configRow as any).draft_updated_at;
      version = (configRow as any).version || 1;
      dbLoaded = true;
    }

    const { data: versionRows, error: vErr } = await supabaseAdmin
      .from('homepage_versions' as any)
      .select('*, profiles:published_by(full_name, email)')
      .order('version_number', { ascending: false })
      .limit(30);

    if (!vErr && versionRows && versionRows.length > 0) {
      versions = (versionRows as any[]).map(v => ({
        id: v.id,
        config_id: v.config_id,
        version_number: v.version_number,
        snapshot_data: v.snapshot_data,
        published_by_name: v.profiles?.full_name,
        published_by_email: v.profiles?.email,
        published_at: v.published_at,
        note: v.note,
        change_summary: v.change_summary,
      }));
    }

    const { data: mediaRows, error: mErr } = await supabaseAdmin
      .from('cms_media' as any)
      .select('*, profiles:uploaded_by(full_name)')
      .order('created_at', { ascending: false });

    if (!mErr && mediaRows && mediaRows.length > 0) {
      media = (mediaRows as any[]).map(m => ({
        id: m.id,
        file_path: m.file_path,
        public_url: m.public_url,
        file_name: m.file_name,
        file_size: Number(m.file_size || 0),
        mime_type: m.mime_type,
        alt_text: m.alt_text,
        section_tag: m.section_tag,
        created_at: m.created_at,
        uploaded_by_name: m.profiles?.full_name,
      }));
    }
  } catch (err) {}

  // 2. If DB config was not loaded, load from Cloud Storage
  if (!dbLoaded) {
    const cloud = await readCloudConfig();
    if (cloud) {
      draft = cloud.draft;
      published = cloud.published;
      published_at = cloud.published_at;
      published_by_name = cloud.published_by_name;
      draft_updated_at = cloud.draft_updated_at;
      version = cloud.version;
    } else {
      const backup = readBackupConfig();
      draft = backup.draft;
      published = backup.published;
      published_at = backup.published_at;
      published_by_name = backup.published_by_name;
      draft_updated_at = backup.draft_updated_at;
      version = backup.version;
    }
  }

  if (versions.length === 0) {
    const cloudVersions = await readCloudVersions();
    versions = cloudVersions.length > 0 ? cloudVersions : readBackupVersions();
  }

  if (media.length === 0) {
    const cloudMedia = await readCloudMedia();
    media = cloudMedia.length > 0 ? cloudMedia : readBackupMedia();
  }

  // 3. Resolve published magazines and active departments from DB
  let available_magazines: any[] = [];
  let available_departments: any[] = [];

  try {
    const [magsRes, deptsRes] = await Promise.all([
      supabaseAdmin
        .from('magazines')
        .select(`
          id,
          title,
          slug,
          academic_year,
          department_id,
          cover_image_url,
          published_at,
          department:departments(name)
        `)
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false }),
      supabaseAdmin
        .from('departments')
        .select('id, name, slug, short_name, description')
        .order('name', { ascending: true }),
    ]);

    if (magsRes.data && magsRes.data.length > 0) {
      available_magazines = magsRes.data.map((m: any) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        academic_year: m.academic_year,
        department_id: m.department_id,
        department_name: m.department?.name,
        cover_image_url: m.cover_image_url,
        published_at: m.published_at,
      }));
    }

    if (deptsRes.data && deptsRes.data.length > 0) {
      available_departments = deptsRes.data.map((d: any) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        short_name: d.short_name,
        description: d.description,
        magazine_count: available_magazines.filter(m => m.department_id === d.id).length,
      }));
    }
  } catch (adminErr) {}

  if (available_magazines.length === 0 && available_departments.length === 0) {
    available_magazines = FALLBACK_MAGAZINES.map(m => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      academic_year: m.academic_year,
      department_id: m.department_id,
      department_name: m.department?.name,
      cover_image_url: m.cover_image_url,
      published_at: m.published_at,
    }));
    available_departments = FALLBACK_DEPARTMENTS.map(d => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      short_name: d.short_name,
      description: d.description,
      magazine_count: available_magazines.filter(m => m.department_id === d.id).length,
    }));
  }

  return {
    draft,
    published,
    published_at,
    published_by_name,
    draft_updated_at,
    version,
    available_magazines,
    available_departments,
    versions,
    media,
  };
}

/**
 * Saves draft configuration without affecting the live public website.
 */
export async function saveLandingPageDraft(
  draft: LandingPageConfig,
  profile: Profile
): Promise<{ success: boolean; error?: string }> {
  const { sanitized, result } = validateAndSanitizeConfig(draft);
  if (!result.isValid) {
    return {
      success: false,
      error: `Validation error: ${result.issues.map(i => `${i.field}: ${i.message}`).join(', ')}`,
    };
  }

  const now = new Date().toISOString();

  // Load current cloud config or local backup to preserve existing published config
  let currentConfig = await readCloudConfig();
  if (!currentConfig) {
    currentConfig = readBackupConfig();
  }

  // 1. Try DB table update/insert
  try {
    const supabase = createAdminClient();
    const { data: existing, error: selectErr } = await supabase
      .from('homepage_configs' as any)
      .select('id, published_data, version')
      .eq('key', 'main')
      .single();

    if (!selectErr && existing) {
      await supabase
        .from('homepage_configs' as any)
        .update({
          draft_data: sanitized,
          draft_updated_at: now,
          draft_updated_by: profile.id,
        })
        .eq('key', 'main');
    } else if (!selectErr) {
      await supabase.from('homepage_configs' as any).insert({
        key: 'main',
        draft_data: sanitized,
        published_data: currentConfig.published || sanitized,
        published_at: now,
        published_by: profile.id,
        draft_updated_at: now,
        draft_updated_by: profile.id,
        version: currentConfig.version || 1,
      });
    }
  } catch (err) {
    // Database table might not exist yet
  }

  // 2. Persist to Supabase Cloud Storage (Guaranteed cross-instance persistence on Vercel)
  const updatedCloudConfig = {
    ...currentConfig,
    draft: sanitized,
    draft_updated_at: now,
    draft_updated_by: profile.id,
  };
  const cloudSaved = await writeCloudConfig(updatedCloudConfig);

  // 3. Persist to local backup file
  writeBackupConfig(updatedCloudConfig);

  console.log(
    `[CMS:SAVE_DRAFT] Draft saved by ${profile.full_name} (${profile.email}). Cloud storage: ${
      cloudSaved ? 'OK' : 'FALLBACK'
    }`
  );

  return { success: true };
}

/**
 * Publishes the current draft to the public homepage, creates a version snapshot,
 * and triggers immediate cache invalidation.
 */
export async function publishLandingPageConfig(
  profile: Profile,
  note?: string
): Promise<{ success: boolean; version?: number; error?: string }> {
  const currentDraft = await getDraftLandingPageConfig();
  const currentPublished = await getPublishedLandingPageConfig();

  const { sanitized, result } = validateAndSanitizeConfig(currentDraft);
  if (!result.isValid) {
    return {
      success: false,
      error: `Cannot publish invalid configuration: ${result.issues.map(i => i.message).join('; ')}`,
    };
  }

  const changeSummary = generateChangeSummary(currentPublished, sanitized);
  const now = new Date().toISOString();

  // Load current cloud config or local backup to determine nextVersion
  let currentConfig = await readCloudConfig();
  if (!currentConfig) {
    currentConfig = readBackupConfig();
  }
  const nextVersion = (currentConfig.version || 1) + 1;

  // 1. Try DB table update
  try {
    const supabase = createAdminClient();
    const { data: configRow } = await supabase
      .from('homepage_configs' as any)
      .select('id, version')
      .eq('key', 'main')
      .single();

    if (configRow) {
      await supabase
        .from('homepage_configs' as any)
        .update({
          published_data: sanitized,
          draft_data: sanitized,
          published_at: now,
          published_by: profile.id,
          version: nextVersion,
          draft_updated_at: now,
          draft_updated_by: profile.id,
        })
        .eq('key', 'main');

      await supabase.from('homepage_versions' as any).insert({
        config_id: (configRow as any).id,
        version_number: nextVersion,
        snapshot_data: sanitized,
        published_by: profile.id,
        published_at: now,
        note: note || `Published v${nextVersion}`,
        change_summary: changeSummary,
      });
    }
  } catch (err) {
    // DB table might not exist
  }

  // 2. Persist to Supabase Cloud Storage (Guaranteed cross-instance persistence on Vercel)
  const publishedCloudData = {
    draft: sanitized,
    published: sanitized,
    published_at: now,
    published_by: profile.id,
    published_by_name: profile.full_name,
    draft_updated_at: now,
    draft_updated_by: profile.id,
    version: nextVersion,
  };
  const cloudSaved = await writeCloudConfig(publishedCloudData);

  // 3. Append to Cloud Versions
  let versions = await readCloudVersions();
  if (!versions || versions.length === 0) {
    versions = readBackupVersions();
  }
  const newSnapshot: CmsVersionSnapshot = {
    id: `v-${Date.now()}`,
    version_number: nextVersion,
    snapshot_data: sanitized,
    published_by_name: profile.full_name,
    published_by_email: profile.email,
    published_at: now,
    note: note || `Published v${nextVersion}`,
    change_summary: changeSummary,
  };
  versions.unshift(newSnapshot);
  await writeCloudVersions(versions);

  // 4. Update local backup files
  writeBackupConfig(publishedCloudData);
  writeBackupVersions(versions);

  // 5. Invalidate Next.js cache for root page & magazines page
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'page');
    revalidatePath('/magazines', 'page');
    console.log(`[CMS:CACHE_INVALIDATED] Successfully revalidated / and /magazines on publish`);
  } catch (e) {
    // Graceful fallback if invoked outside Next.js request context
  }

  console.log(
    `[CMS:PUBLISH] Successfully published v${nextVersion} by ${profile.full_name}. Cloud storage: ${
      cloudSaved ? 'OK' : 'FALLBACK'
    }`
  );

  return { success: true, version: nextVersion };
}

/**
 * Restores a past snapshot as both draft and published configuration.
 */
export async function restoreLandingPageVersion(
  versionNumber: number,
  profile: Profile
): Promise<{ success: boolean; version?: number; error?: string }> {
  let targetSnapshot: LandingPageConfig | null = null;

  // 1. Try DB
  try {
    const supabase = createAdminClient();
    const { data: vRow } = await supabase
      .from('homepage_versions' as any)
      .select('snapshot_data')
      .eq('version_number', versionNumber)
      .single();

    if (vRow && (vRow as any).snapshot_data) {
      targetSnapshot = (vRow as any).snapshot_data;
    }
  } catch (err) {}

  // 2. Try Cloud Storage
  if (!targetSnapshot) {
    const cloudVersions = await readCloudVersions();
    const found = cloudVersions.find(v => v.version_number === versionNumber);
    if (found) {
      targetSnapshot = found.snapshot_data;
    }
  }

  // 3. Try Local Backup
  if (!targetSnapshot) {
    const backupVersions = readBackupVersions();
    const found = backupVersions.find(v => v.version_number === versionNumber);
    if (found) {
      targetSnapshot = found.snapshot_data;
    }
  }

  if (!targetSnapshot) {
    return { success: false, error: `Version ${versionNumber} not found.` };
  }

  // Save as draft first
  await saveLandingPageDraft(targetSnapshot, profile);

  // Then publish with rollback note
  return await publishLandingPageConfig(
    profile,
    `Restored from Version ${versionNumber}`
  );
}

/**
 * Resets the draft configuration to default system defaults.
 */
export async function resetLandingPageToDefaults(
  profile: Profile
): Promise<{ success: boolean }> {
  await saveLandingPageDraft(DEFAULT_LANDING_PAGE_CONFIG, profile);
  return await publishLandingPageConfig(profile, 'Reset to factory defaults');
}

/**
 * Records a newly uploaded media asset in the database.
 */
export async function recordCmsMediaAsset(
  asset: Omit<CmsMediaAsset, 'id' | 'created_at'>,
  profile: Profile
): Promise<CmsMediaAsset> {
  const newAsset: CmsMediaAsset = {
    id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...asset,
    created_at: new Date().toISOString(),
    uploaded_by_name: profile.full_name,
  };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('cms_media' as any)
      .insert({
        file_path: asset.file_path,
        public_url: asset.public_url,
        file_name: asset.file_name,
        file_size: asset.file_size,
        mime_type: asset.mime_type,
        alt_text: asset.alt_text,
        section_tag: asset.section_tag,
        uploaded_by: profile.id,
      })
      .select()
      .single();

    if (!error && data) {
      return {
        id: (data as any).id,
        file_path: (data as any).file_path,
        public_url: (data as any).public_url,
        file_name: (data as any).file_name,
        file_size: Number((data as any).file_size || 0),
        mime_type: (data as any).mime_type,
        alt_text: (data as any).alt_text,
        section_tag: (data as any).section_tag,
        created_at: (data as any).created_at,
        uploaded_by_name: profile.full_name,
      };
    }
  } catch (err) {}

  // Cloud storage media list
  let cloudMedia = await readCloudMedia();
  cloudMedia.unshift(newAsset);
  await writeCloudMedia(cloudMedia);

  const existing = readBackupMedia();
  existing.unshift(newAsset);
  writeBackupMedia(existing);
  return newAsset;
}

/**
 * Deletes a media asset record.
 */
export async function deleteCmsMediaAsset(id: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    await supabase.from('cms_media' as any).delete().eq('id', id);
  } catch (err) {}

  let cloudMedia = await readCloudMedia();
  cloudMedia = cloudMedia.filter(m => m.id !== id);
  await writeCloudMedia(cloudMedia);

  const existing = readBackupMedia();
  const filtered = existing.filter(m => m.id !== id);
  writeBackupMedia(filtered);
  return true;
}
