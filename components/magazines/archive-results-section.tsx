import React from 'react';
import { MagazineGrid } from '@/components/magazines/magazine-grid';
import { Magazine } from '@/types/magazine';

interface ArchiveResultsSectionProps {
  magazines: Magazine[];
  hasActiveFilters?: boolean;
}

export function ArchiveResultsSection({
  magazines,
  hasActiveFilters = false,
}: ArchiveResultsSectionProps) {
  return (
    <section aria-label="Magazine Results">
      <MagazineGrid
        magazines={magazines}
        emptyType={hasActiveFilters ? 'search' : 'magazines'}
        emptyMessage={
          hasActiveFilters
            ? 'No published magazines match your active search and filter criteria.'
            : 'No digital magazines have been approved and published to the public archive yet.'
        }
      />
    </section>
  );
}
