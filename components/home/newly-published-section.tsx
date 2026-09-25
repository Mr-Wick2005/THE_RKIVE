import React from 'react';
import { SectionHeading } from '@/components/ui/section-heading';
import { MagazineGrid } from '@/components/magazines/magazine-grid';
import { Magazine } from '@/types/magazine';

interface NewlyPublishedSectionProps {
  magazines: Magazine[];
}

export function NewlyPublishedSection({ magazines }: NewlyPublishedSectionProps) {
  return (
    <section id="newly-published" className="max-w-7xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
      <SectionHeading
        eyebrow="Recent Releases"
        title="Newly Published"
        subtitle="The latest peer-reviewed digital magazines, periodicals, and research publications released across academic departments."
        linkHref="/magazines"
        linkLabel="View Complete Archive"
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
