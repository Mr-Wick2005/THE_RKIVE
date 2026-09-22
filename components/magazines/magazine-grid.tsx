import React from 'react';
import { MagazineCard } from './magazine-card';
import { MagazineWithRelations } from '@/types/magazine';
import { EmptyState } from '@/components/ui/empty-state';

interface MagazineGridProps {
  magazines: MagazineWithRelations[];
  emptyMessage?: string;
  emptyType?: 'search' | 'department' | 'magazines';
}

export function MagazineGrid({
  magazines,
  emptyMessage,
  emptyType = 'magazines',
}: MagazineGridProps) {
  if (magazines.length === 0) {
    return <EmptyState type={emptyType} description={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 sm:gap-10">
      {magazines.map((magazine) => (
        <MagazineCard key={magazine.id} magazine={magazine} />
      ))}
    </div>
  );
}
