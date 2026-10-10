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

/**
 * Returns the currently published LandingPageConfig for the public homepage.
 * Highly resilient: uses Supabase DB if available, fallback JSON, or default config.
 */
export async function getPublishedLandingPageConfig(): Promise<LandingPageConfig> {
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
    // Fallback to local backup or default
  }

  const backup = readBackupConfig();
  const { sanitized } = validateAndSanitizeConfig(backup.published);
  return sanitized;
}

/**
 * Returns the current draft LandingPageConfig for the Super Admin Studio.
 */
export async function getDraftLandingPageConfig(): Promise<LandingPageConfig> {
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

  const backup = readBackupConfig();
  const { sanitized } = validateAndSanitizeConfig(backup.draft);
  return sanitized;
}

/**
 * Fetches all data needed to initialize the Super Admin Landing Page Studio.
 */
export async function getLandingPageStudioData(profile: Profile): Promise<CmsStudioData> {
  let draft = DEFAULT_LANDING_PAGE_CONFIG;
  let published = DEFAULT_LANDING_PAGE_CONFIG;
  let published_at: string | undefined;
  let published_by_name: string | undefined;
  let draft_updated_at: string | undefined;
  let version = 1;
  let versions: CmsVersionSnapshot[] = [];
  let media: CmsMediaAsset[] = [];

  const supabaseAdmin = createAdminClient();

  // 1. Fetch config from Supabase or fallback
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
    } else {
      const backup = readBackupConfig();
      draft = backup.draft;
      published = backup.published;
      published_at = backup.published_at;
      published_by_name = backup.published_by_name;
      draft_updated_at = backup.draft_updated_at;
      version = backup.version;
    }

    // 2. Fetch versions
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
    } else {
      versions = readBackupVersions();
    }

    // 3. Fetch media
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
    } else {
      media = readBackupMedia();
    }
  } catch (err) {
    const backup = readBackupConfig();
    draft = backup.draft;
    published = backup.published;
    published_at = backup.published_at;
    published_by_name = backup.published_by_name;
    draft_updated_at = backup.draft_updated_at;
    version = backup.version;
    versions = readBackupVersions();
    media = readBackupMedia();
  }

  // 4. Fetch available published magazines and departments for select pickers
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
  } catch (adminErr) {
    // If admin fetch fails, fallback gracefully
  }

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
 * Saves draft changes without affecting the public website.
 */
export async function saveLandingPageDraft(
  draftData: LandingPageConfig,
  profile: Profile
): Promise<{ success: boolean; error?: string }> {
  const { sanitized, result } = validateAndSanitizeConfig(draftData);
  if (!result.isValid) {
    return {
      success: false,
      error: `Validation error: ${result.issues.map(i => `${i.field}: ${i.message}`).join(', ')}`,
    };
  }

  const now = new Date().toISOString();

  try {
    const supabase = createAdminClient();

    // Check if row exists
    const { data: existing } = await supabase
      .from('homepage_configs' as any)
      .select('id, published_data, version')
      .eq('key', 'main')
      .single();

    if (existing) {
      await supabase
        .from('homepage_configs' as any)
        .update({
          draft_data: sanitized,
          draft_updated_at: now,
          draft_updated_by: profile.id,
        })
        .eq('key', 'main');
    } else {
      await supabase.from('homepage_configs' as any).insert({
        key: 'main',
        draft_data: sanitized,
        published_data: sanitized,
        published_at: now,
        published_by: profile.id,
        draft_updated_at: now,
        draft_updated_by: profile.id,
        version: 1,
      });
    }
  } catch (err) {
    // Database table might not exist yet, save to backup
  }

  // Always update backup file
  const currentBackup = readBackupConfig();
  writeBackupConfig({
    ...currentBackup,
    draft: sanitized,
    draft_updated_at: now,
  });

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
  let nextVersion = 1;

  try {
    const supabase = createAdminClient();

    const { data: configRow } = await supabase
      .from('homepage_configs' as any)
      .select('id, version')
      .eq('key', 'main')
      .single();

    if (configRow) {
      nextVersion = ((configRow as any).version || 1) + 1;
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

      // Create version snapshot
      await supabase.from('homepage_versions' as any).insert({
        config_id: (configRow as any).id,
        version_number: nextVersion,
        snapshot_data: sanitized,
        published_by: profile.id,
        published_at: now,
        note: note || `Published v${nextVersion}`,
        change_summary: changeSummary,
      });
    } else {
      const { data: newRow } = await supabase
        .from('homepage_configs' as any)
        .insert({
          key: 'main',
          draft_data: sanitized,
          published_data: sanitized,
          published_at: now,
          published_by: profile.id,
          draft_updated_at: now,
          draft_updated_by: profile.id,
          version: 1,
        })
        .select('id')
        .single();

      if (newRow) {
        await supabase.from('homepage_versions' as any).insert({
          config_id: (newRow as any).id,
          version_number: 1,
          snapshot_data: sanitized,
          published_by: profile.id,
          published_at: now,
          note: note || 'Initial landing page publish',
          change_summary: ['Initial Publication'],
        });
      }
    }
  } catch (err) {
    const backup = readBackupConfig();
    nextVersion = backup.version + 1;
  }

  // Update backup store
  const newBackup = {
    draft: sanitized,
    published: sanitized,
    published_at: now,
    published_by_name: profile.full_name,
    draft_updated_at: now,
    version: nextVersion,
  };
  writeBackupConfig(newBackup);

  const existingVersions = readBackupVersions();
  existingVersions.unshift({
    id: `v-${Date.now()}`,
    version_number: nextVersion,
    snapshot_data: sanitized,
    published_by_name: profile.full_name,
    published_by_email: profile.email,
    published_at: now,
    note: note || `Published v${nextVersion}`,
    change_summary: changeSummary,
  });
  writeBackupVersions(existingVersions);

  // Invalidate Next.js cache for root page
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
  } catch (e) {
    // Graceful fallback if invoked outside Next.js request context
  }

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
  return { success: true };
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

  const existing = readBackupMedia();
  const filtered = existing.filter(m => m.id !== id);
  writeBackupMedia(filtered);
  return true;
}
