import React from 'react';
import { SectionHeading } from '@/components/ui/section-heading';
import { MagazineShelf } from '@/components/magazines/magazine-shelf';
import { Magazine } from '@/types/magazine';

interface BookshelfSectionProps {
  magazines: Magazine[];
}

export function BookshelfSection({ magazines }: BookshelfSectionProps) {
  return (
    <section id="bookshelf" className="border-y border-[#E8E2D8] bg-black/[0.02] py-20 px-6 sm:px-10 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          eyebrow="Interactive Browsing"
          title="The Digital Bookshelf"
          subtitle="Browse through recent college publications as physical volumes. Hover or click to explore individual issues."
          linkHref="/magazines"
          linkLabel="Full Catalog"
        />

        <MagazineShelf magazines={magazines} />
      </div>
    </section>
  );
}
