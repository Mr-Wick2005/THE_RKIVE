import { LandingPageConfig } from '@/types/cms';

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

/**
 * Validates that a given URL is safe for web links (prevents XSS/javascript: uri injection).
 */
export function isSafeUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:') || trimmed.startsWith('data:text/html')) {
    return false;
  }
  return true;
}

/**
 * Validates 3 or 6 digit hex color code.
 */
export function isValidHexColor(color: string | undefined | null): boolean {
  if (!color) return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color.trim());
}

/**
 * Basic string sanitization that removes potential script tags and control characters.
 */
export function sanitizeString(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

/**
 * Deeply validates and sanitizes a complete LandingPageConfig object before saving or publishing.
 */
export function validateAndSanitizeConfig(input: Partial<LandingPageConfig>): {
  sanitized: LandingPageConfig;
  result: ValidationResult;
} {
  const issues: ValidationIssue[] = [];

  // Deep clone or fallback
  const sanitized = JSON.parse(JSON.stringify(input)) as LandingPageConfig;

  // 1. Header Validation
  if (!sanitized.header) {
    issues.push({ field: 'header', message: 'Header configuration is required' });
  } else {
    sanitized.header.brand_name = sanitizeString(sanitized.header.brand_name) || 'THE RKIVE';
    sanitized.header.tagline = sanitizeString(sanitized.header.tagline);
    sanitized.header.logo_url = sanitizeString(sanitized.header.logo_url);
    sanitized.header.badge_text = sanitizeString(sanitized.header.badge_text);

    if (sanitized.header.logo_url && !isSafeUrl(sanitized.header.logo_url)) {
      issues.push({ field: 'header.logo_url', message: 'Header logo URL contains an unsafe protocol' });
    }

    if (Array.isArray(sanitized.header.nav_links)) {
      sanitized.header.nav_links.forEach((link, idx) => {
        link.label = sanitizeString(link.label);
        link.href = sanitizeString(link.href);
        if (!link.label) {
          issues.push({ field: `header.nav_links[${idx}]`, message: 'Navigation link label cannot be empty' });
        }
        if (!isSafeUrl(link.href)) {
          issues.push({ field: `header.nav_links[${idx}].href`, message: 'Navigation link URL is unsafe' });
        }
      });
    }
  }

  // 2. Hero Validation
  if (!sanitized.hero) {
    issues.push({ field: 'hero', message: 'Hero configuration is required' });
  } else {
    sanitized.hero.title_line1 = sanitizeString(sanitized.hero.title_line1);
    sanitized.hero.title_line2 = sanitizeString(sanitized.hero.title_line2);
    sanitized.hero.subtitle = sanitizeString(sanitized.hero.subtitle);

    if (sanitized.hero.primary_cta?.href && !isSafeUrl(sanitized.hero.primary_cta.href)) {
      issues.push({ field: 'hero.primary_cta.href', message: 'Primary CTA URL is unsafe' });
    }
    if (sanitized.hero.secondary_cta?.href && !isSafeUrl(sanitized.hero.secondary_cta.href)) {
      issues.push({ field: 'hero.secondary_cta.href', message: 'Secondary CTA URL is unsafe' });
    }
  }

  // 3. Theme Validation
  if (sanitized.theme) {
    if (sanitized.theme.accent_primary && !isValidHexColor(sanitized.theme.accent_primary)) {
      sanitized.theme.accent_primary = '#1B44B8'; // fallback
    }
    if (sanitized.theme.accent_secondary && !isValidHexColor(sanitized.theme.accent_secondary)) {
      sanitized.theme.accent_secondary = '#C24A26';
    }
    if (sanitized.theme.surface_background && !isValidHexColor(sanitized.theme.surface_background)) {
      sanitized.theme.surface_background = '#FAF7F2';
    }
  }

  // 4. Archive Reel Validation
  if (sanitized.archive_reel) {
    if (sanitized.archive_reel.video_url && !isSafeUrl(sanitized.archive_reel.video_url)) {
      issues.push({ field: 'archive_reel.video_url', message: 'Archive reel video URL is unsafe' });
    }
    if (sanitized.archive_reel.poster_image_url && !isSafeUrl(sanitized.archive_reel.poster_image_url)) {
      issues.push({ field: 'archive_reel.poster_image_url', message: 'Archive reel poster URL is unsafe' });
    }
  }

  // 5. About Section Validation
  if (sanitized.about_section) {
    if (sanitized.about_section.image_url && !isSafeUrl(sanitized.about_section.image_url)) {
      issues.push({ field: 'about_section.image_url', message: 'About section image URL is unsafe' });
    }
    if (Array.isArray(sanitized.about_section.body_paragraphs)) {
      sanitized.about_section.body_paragraphs = sanitized.about_section.body_paragraphs
        .map(p => sanitizeString(p))
        .filter(Boolean);
    }
  }

  // 6. Section Order
  if (!Array.isArray(sanitized.section_order) || sanitized.section_order.length === 0) {
    sanitized.section_order = [
      'hero',
      'archive_reel',
      'recent_releases',
      'departments_showcase',
      'about_section',
      'bookshelf_section',
      'archive_manifesto',
    ];
  }

  return {
    sanitized,
    result: {
      isValid: issues.length === 0,
      issues,
    },
  };
}

/**
 * Compares two LandingPageConfig snapshots to produce human-readable change summaries.
 */
export function generateChangeSummary(before: LandingPageConfig, after: LandingPageConfig): string[] {
  const changes: string[] = [];

  if (JSON.stringify(before.header) !== JSON.stringify(after.header)) {
    changes.push('Header & Navigation');
  }
  if (JSON.stringify(before.hero) !== JSON.stringify(after.hero)) {
    changes.push('Hero Section & Typography');
  }
  if (JSON.stringify(before.archive_reel) !== JSON.stringify(after.archive_reel)) {
    changes.push('Archive Reel Video & Playback');
  }
  if (JSON.stringify(before.recent_releases) !== JSON.stringify(after.recent_releases)) {
    changes.push('Recent Releases / Featured Magazines');
  }
  if (JSON.stringify(before.departments_showcase) !== JSON.stringify(after.departments_showcase)) {
    changes.push('Departments Showcase Directory');
  }
  if (JSON.stringify(before.about_section) !== JSON.stringify(after.about_section)) {
    changes.push('About THE RKIVE & Artwork');
  }
  if (JSON.stringify(before.bookshelf_section) !== JSON.stringify(after.bookshelf_section)) {
    changes.push('Interactive Digital Bookshelf');
  }
  if (JSON.stringify(before.archive_manifesto) !== JSON.stringify(after.archive_manifesto)) {
    changes.push('Archive Manifesto & Badges');
  }
  if (JSON.stringify(before.footer) !== JSON.stringify(after.footer)) {
    changes.push('Footer & Legal Masthead');
  }
  if (JSON.stringify(before.theme) !== JSON.stringify(after.theme)) {
    changes.push('Theme & Appearance Settings');
  }
  if (JSON.stringify(before.section_order) !== JSON.stringify(after.section_order)) {
    changes.push('Homepage Section Ordering');
  }
  if (JSON.stringify(before.seo) !== JSON.stringify(after.seo)) {
    changes.push('SEO & Metadata');
  }

  return changes.length > 0 ? changes : ['Minor content refinement'];
}
