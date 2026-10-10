import React from 'react';
import { SectionHeading } from '@/components/ui/section-heading';
import { MagazineShelf } from '@/components/magazines/magazine-shelf';
import { Magazine } from '@/types/magazine';
import { BookshelfSectionConfig } from '@/types/cms';

interface BookshelfSectionProps {
  magazines: Magazine[];
  config?: BookshelfSectionConfig;
}

export function BookshelfSection({ magazines, config }: BookshelfSectionProps) {
  if (config?.is_visible === false) return null;

  const eyebrow = config?.eyebrow || 'Interactive Browsing';
  const title = config?.title || 'The Digital Bookshelf';
  const subtitle =
    config?.subtitle ||
    'Browse through recent college publications as physical volumes. Hover or click to explore individual issues.';

  const displayMagazines = config?.max_items ? magazines.slice(0, config.max_items) : magazines;

  return (
    <section id="bookshelf" className="border-y border-[#E8E2D8] bg-black/[0.02] py-20 px-6 sm:px-10 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          linkHref="/magazines"
          linkLabel="Full Catalog"
        />

        <MagazineShelf magazines={displayMagazines} />
      </div>
    </section>
  );
}
