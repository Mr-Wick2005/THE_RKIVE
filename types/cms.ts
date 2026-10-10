import { Magazine } from './magazine';
import { DepartmentWithStats } from './department';

export type SectionId =
  | 'overview'
  | 'header'
  | 'hero'
  | 'archive_reel'
  | 'recent_releases'
  | 'departments_showcase'
  | 'about_section'
  | 'archive_manifesto'
  | 'bookshelf_section'
  | 'footer'
  | 'theme'
  | 'media_library'
  | 'version_history';

export interface NavLinkItem {
  id: string;
  label: string;
  href: string;
  is_visible: boolean;
  open_in_new_tab?: boolean;
}

export interface HeaderCtaButton {
  label: string;
  href: string;
  is_visible: boolean;
}

export interface HeaderConfig {
  logo_url: string;
  logo_alt: string;
  brand_name: string;
  tagline: string;
  badge_text: string;
  nav_links: NavLinkItem[];
  cta_button: HeaderCtaButton;
  sticky: boolean;
  backdrop_blur: boolean;
}

export interface HeroStatItem {
  id: string;
  value: string;
  label: string;
  suffix?: string;
  is_visible: boolean;
  is_dynamic?: boolean; // If true, can pull live count from database
  dynamic_source?: 'departments' | 'published_magazines' | 'custom';
}

export interface HeroCtaButton {
  label: string;
  href: string;
  is_visible: boolean;
  icon?: string;
}

export type HeroLayoutVariant = 'split-video' | 'split-artwork' | 'centered' | 'minimal';

export interface HeroConfig {
  is_visible: boolean;
  eyebrow: string;
  title_line1: string;
  title_line2: string;
  title_emphasis: string;
  subtitle: string;
  primary_cta: HeroCtaButton;
  secondary_cta: HeroCtaButton;
  stats: HeroStatItem[];
  layout_variant: HeroLayoutVariant;
  custom_artwork_url?: string;
  custom_artwork_alt?: string;
}

export interface ArchiveReelConfig {
  is_visible: boolean;
  badge_title: string;
  loop_tag_text: string;
  video_url: string;
  poster_image_url: string;
  auto_play: boolean;
  loop: boolean;
  muted_default: boolean;
  show_controls: boolean;
  show_fullscreen_button: boolean;
  caption: string;
}

export type ReleasesSelectionMode = 'automatic' | 'manual';
export type MagazineCardVariant = 'standard' | 'compact' | 'editorial';

export interface RecentReleasesConfig {
  is_visible: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  view_all_link_text: string;
  view_all_link_href: string;
  mode: ReleasesSelectionMode;
  max_items: number;
  featured_magazine_ids: string[];
  card_variant: MagazineCardVariant;
  show_department_badge: boolean;
  show_academic_year: boolean;
  show_edition: boolean;
  show_page_count: boolean;
}

export type DepartmentSelectionMode = 'automatic' | 'manual';

export interface DepartmentOverride {
  display_label?: string;
  custom_description?: string;
  cover_image_url?: string;
}

export interface DepartmentsShowcaseConfig {
  is_visible: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  mode: DepartmentSelectionMode;
  max_items: number;
  featured_department_ids: string[];
  department_overrides: Record<string, DepartmentOverride>;
}

export type AboutLayoutVariant = 'image-right' | 'image-left' | 'card-accent';

export interface AboutSectionConfig {
  is_visible: boolean;
  eyebrow: string;
  title: string;
  body_paragraphs: string[];
  cta: {
    label: string;
    href: string;
    is_visible: boolean;
  };
  image_url: string;
  image_alt: string;
  layout_variant: AboutLayoutVariant;
}

export interface ManifestoBadge {
  id: string;
  icon: string;
  text: string;
}

export interface ArchiveManifestoConfig {
  is_visible: boolean;
  eyebrow: string;
  title: string;
  description: string;
  badges: ManifestoBadge[];
}

export interface BookshelfSectionConfig {
  is_visible: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  max_items: number;
}

export interface FooterLinkItem {
  id: string;
  label: string;
  href: string;
}

export interface SocialLinkItem {
  id: string;
  platform: string;
  url: string;
  is_visible: boolean;
}

export interface FooterConfig {
  brand_description: string;
  logo_url: string;
  badge_text: string;
  quick_links: FooterLinkItem[];
  faculty_links: FooterLinkItem[];
  social_links: SocialLinkItem[];
  copyright_text: string;
  credits_developer_1: string;
  credits_developer_2: string;
  show_admin_link: boolean;
  show_rls_badge: boolean;
}

export type TypographyPreset = 'editorial-serif' | 'modern-academic' | 'classic-press';
export type BorderStylePreset = 'thick-solid' | 'refined-mono' | 'minimal';
export type SectionSpacingPreset = 'compact' | 'normal' | 'generous';

export interface ThemeConfig {
  accent_primary: string; // e.g. '#1B44B8'
  accent_secondary: string; // e.g. '#C24A26'
  accent_highlight: string; // e.g. '#B58A55'
  surface_background: string; // e.g. '#FAF7F2'
  surface_card: string; // e.g. '#F4EFEB'
  text_primary: string; // e.g. '#1A1A1A'
  text_secondary: string; // e.g. '#3E3C38'
  typography_preset: TypographyPreset;
  border_style: BorderStylePreset;
  section_spacing: SectionSpacingPreset;
}

export interface SeoConfig {
  meta_title: string;
  meta_description: string;
  og_image_url?: string;
  keywords?: string[];
}

export interface LandingPageConfig {
  header: HeaderConfig;
  hero: HeroConfig;
  archive_reel: ArchiveReelConfig;
  recent_releases: RecentReleasesConfig;
  departments_showcase: DepartmentsShowcaseConfig;
  about_section: AboutSectionConfig;
  archive_manifesto: ArchiveManifestoConfig;
  bookshelf_section: BookshelfSectionConfig;
  footer: FooterConfig;
  theme: ThemeConfig;
  seo: SeoConfig;
  section_order: string[];
}

export interface CmsVersionSnapshot {
  id: string;
  config_id?: string;
  version_number: number;
  snapshot_data: LandingPageConfig;
  published_by_name?: string;
  published_by_email?: string;
  published_at: string;
  note?: string;
  change_summary?: string[];
}

export interface CmsMediaAsset {
  id: string;
  file_path: string;
  public_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  alt_text?: string;
  section_tag?: string;
  created_at: string;
  uploaded_by_name?: string;
}

export interface CmsStudioData {
  draft: LandingPageConfig;
  published: LandingPageConfig;
  published_at?: string;
  published_by_name?: string;
  draft_updated_at?: string;
  version: number;
  available_magazines: Array<{
    id: string;
    title: string;
    slug: string;
    academic_year: string;
    department_id: string;
    department_name?: string;
    cover_image_url?: string | null;
    published_at?: string | null;
  }>;
  available_departments: Array<{
    id: string;
    name: string;
    slug: string;
    short_name: string;
    description?: string | null;
    magazine_count?: number;
  }>;
  versions: CmsVersionSnapshot[];
  media: CmsMediaAsset[];
}
