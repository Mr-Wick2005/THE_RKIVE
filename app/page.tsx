import React from 'react';
import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getDepartmentsWithStats, FALLBACK_DEPARTMENTS } from '@/lib/departments';
import { getPublishedMagazines, FALLBACK_MAGAZINES } from '@/lib/magazines';
import { getPublishedLandingPageConfig } from '@/lib/cms/store';
import {
  HeroSection,
  NewlyPublishedSection,
  DepartmentsSection,
  AboutUsSection,
  ArchiveManifestoSection,
  BookshelfSection,
} from '@/components/home';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPublishedLandingPageConfig();
  return {
    title: config.seo?.meta_title || 'THE RKIVE — College Digital Magazine Archive & Publications',
    description:
      config.seo?.meta_description ||
      'Explore peer-reviewed digital magazines, engineering symposium journals, and student capstone periodicals from all academic departments.',
    openGraph: {
      title: config.seo?.meta_title || 'THE RKIVE — College Digital Magazine Archive',
      description: config.seo?.meta_description,
      images: config.seo?.og_image_url ? [{ url: config.seo.og_image_url }] : undefined,
    },
  };
}

export default async function HomePage() {
  const [config, departmentsWithStats, allPublished] = await Promise.all([
    getPublishedLandingPageConfig(),
    getDepartmentsWithStats().catch(() => []),
    getPublishedMagazines().catch(() => []),
  ]);

  // 1. Resolve Recent Releases magazines according to CMS configuration
  const resolvedMagazines = (() => {
    const recConfig = config.recent_releases;
    const allMags = allPublished.length > 0 ? allPublished : FALLBACK_MAGAZINES;

    if (recConfig.mode === 'manual') {
      const selectedIds = recConfig.featured_magazine_ids || [];
      // Explicit manual curation: if empty, show zero (never fall back to all)
      if (selectedIds.length === 0) {
        return [];
      }
      const selected = selectedIds
        .map((id) => allMags.find((m) => m.id === id))
        .filter(Boolean) as typeof allMags;
      return selected.slice(0, recConfig.max_items || 4);
    }
    return allMags.slice(0, recConfig.max_items || 4);
  })();

  // 2. Resolve Department Showcase departments according to CMS configuration
  const resolvedDepartments = (() => {
    const deptConfig = config.departments_showcase;
    const allDepts = departmentsWithStats.length > 0 ? departmentsWithStats : FALLBACK_DEPARTMENTS;

    if (deptConfig.mode === 'manual') {
      const selectedIds = deptConfig.featured_department_ids || [];
      // Explicit manual curation: if empty, show zero (never fall back to all)
      if (selectedIds.length === 0) {
        return [];
      }
      // Strictly maintain manual selection and ordering
      const selected = selectedIds
        .map((id) => allDepts.find((d) => d.id === id))
        .filter(Boolean) as typeof allDepts;
      return selected.slice(0, deptConfig.max_items || 8);
    }
    return allDepts.slice(0, deptConfig.max_items || 8);
  })();

  // 3. Render dynamic section ordering with visibility checks
  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case 'hero':
        if (config.hero?.is_visible === false) return null;
        return (
          <HeroSection
            key="hero"
            departmentsCount={departmentsWithStats.length || FALLBACK_DEPARTMENTS.length}
            publishedCount={allPublished.length || FALLBACK_MAGAZINES.length}
            magazines={allPublished.length > 0 ? allPublished : FALLBACK_MAGAZINES}
            config={config.hero}
            reelConfig={config.archive_reel}
            themeConfig={config.theme}
          />
        );

      case 'archive_reel':
        if (config.archive_reel?.is_visible === false) return null;
        return null;

      case 'recent_releases':
        if (config.recent_releases?.is_visible === false) return null;
        return (
          <NewlyPublishedSection
            key="recent_releases"
            magazines={resolvedMagazines}
            config={config.recent_releases}
          />
        );

      case 'departments_showcase':
        if (config.departments_showcase?.is_visible === false) return null;
        return (
          <DepartmentsSection
            key="departments_showcase"
            departments={resolvedDepartments}
            config={config.departments_showcase}
          />
        );

      case 'about_section':
        if (config.about_section?.is_visible === false) return null;
        return (
          <AboutUsSection
            key="about_section"
            config={config.about_section}
          />
        );

      case 'bookshelf_section':
        if (config.bookshelf_section?.is_visible === false) return null;
        return (
          <BookshelfSection
            key="bookshelf_section"
            magazines={allPublished.length > 0 ? allPublished : FALLBACK_MAGAZINES}
            config={config.bookshelf_section}
          />
        );

      case 'archive_manifesto':
        if (config.archive_manifesto?.is_visible === false) return null;
        return (
          <ArchiveManifestoSection
            key="archive_manifesto"
            config={config.archive_manifesto}
          />
        );

      default:
        return null;
    }
  };

  const sectionOrder = config.section_order || [
    'hero',
    'recent_releases',
    'departments_showcase',
    'about_section',
  ];

  return (
    <div
      className="flex flex-col min-h-screen bg-transparent"
      style={{
        backgroundColor: config.theme?.surface_background || 'transparent',
      }}
    >
      <Header config={config.header} />

      <main className="flex-1">
        {sectionOrder.map((secKey) => renderSection(secKey))}
      </main>

      <Footer config={config.footer} />
    </div>
  );
}
