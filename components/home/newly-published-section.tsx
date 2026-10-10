import React from 'react';
import { SectionHeading } from '@/components/ui/section-heading';
import { MagazineGrid } from '@/components/magazines/magazine-grid';
import { Magazine } from '@/types/magazine';
import { RecentReleasesConfig } from '@/types/cms';

interface NewlyPublishedSectionProps {
  magazines: Magazine[];
  config?: RecentReleasesConfig;
}

export function NewlyPublishedSection({ magazines, config }: NewlyPublishedSectionProps) {
  if (config?.is_visible === false) return null;

  const eyebrow = config?.eyebrow || 'Recent Releases';
  const title = config?.title || 'Newly Published';
  const subtitle =
    config?.subtitle ||
    'The latest peer-reviewed digital magazines, periodicals, and research publications released across academic departments.';
  const linkLabel = config?.view_all_link_text || 'View Complete Archive';
  const linkHref = config?.view_all_link_href || '/magazines';

  return (
    <section id="newly-published" className="max-w-7xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        linkHref={linkHref}
        linkLabel={linkLabel}
      />

      <MagazineGrid
        magazines={magazines}
        emptyMessage="No new magazine editions found. Newly published issues will appear here once released."
      />
    </section>
  );
}

// Backward-compatible alias
export const FeaturedMagazinesSection = NewlyPublishedSection;
