import React from 'react';
import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getDepartmentsWithStats } from '@/lib/departments';
import { getPublishedMagazines } from '@/lib/magazines';
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
    if (recConfig.mode === 'manual' && recConfig.featured_magazine_ids?.length > 0) {
      const selected = recConfig.featured_magazine_ids
        .map((id) => allPublished.find((m) => m.id === id))
        .filter(Boolean) as typeof allPublished;
      return selected.slice(0, recConfig.max_items || 4);
    }
    return allPublished.slice(0, recConfig.max_items || 4);
  })();

  // 2. Resolve Department Showcase departments according to CMS configuration
  const resolvedDepartments = (() => {
    const deptConfig = config.departments_showcase;
    if (deptConfig.mode === 'manual' && deptConfig.featured_department_ids?.length > 0) {
      const selected = deptConfig.featured_department_ids
        .map((id) => departmentsWithStats.find((d) => d.id === id))
        .filter(Boolean) as typeof departmentsWithStats;
      return selected.slice(0, deptConfig.max_items || 8);
    }
    return departmentsWithStats.slice(0, deptConfig.max_items || 8);
  })();

  // 3. Render dynamic section ordering
  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case 'hero':
        return (
          <HeroSection
            key="hero"
            departmentsCount={departmentsWithStats.length}
            publishedCount={allPublished.length}
            magazines={allPublished}
            config={config.hero}
            reelConfig={config.archive_reel}
            themeConfig={config.theme}
          />
        );

      case 'archive_reel':
        // If layout variant is not split-video and archive_reel is visible separately, it can render here
        return null;

      case 'recent_releases':
        return (
          <NewlyPublishedSection
            key="recent_releases"
            magazines={resolvedMagazines}
            config={config.recent_releases}
          />
        );

      case 'departments_showcase':
        return (
          <DepartmentsSection
            key="departments_showcase"
            departments={resolvedDepartments}
            config={config.departments_showcase}
          />
        );

      case 'about_section':
        return (
          <AboutUsSection
            key="about_section"
            config={config.about_section}
          />
        );

      case 'bookshelf_section':
        return (
          <BookshelfSection
            key="bookshelf_section"
            magazines={allPublished}
            config={config.bookshelf_section}
          />
        );

      case 'archive_manifesto':
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
