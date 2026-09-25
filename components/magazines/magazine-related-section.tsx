import React from 'react';
import Link from 'next/link';
import { Magazine } from '@/types/magazine';
import { MagazineCard } from './magazine-card';

interface MagazineRelatedSectionProps {
  departmentName?: string;
  departmentSlug?: string;
  magazines: Magazine[];
}

export function MagazineRelatedSection({
  departmentName,
  departmentSlug,
  magazines,
}: MagazineRelatedSectionProps) {
  if (magazines.length === 0) return null;

  return (
    <section className="space-y-8 mt-12 pt-8 border-t border-[#2C2824]/20">
      <div className="border-b border-[#2C2824]/15 pb-4 flex items-center justify-between">
        <div>
          {departmentName && (
            <span className="text-xs sm:text-sm font-mono uppercase tracking-widest font-bold text-[#8C2C14] block">
              More from {departmentName}
            </span>
          )}
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#121210] mt-1">
            Department Archival Issues
          </h3>
        </div>
        {departmentSlug && (
          <Link
            href={`/department/${departmentSlug}`}
            className="text-sm font-bold uppercase tracking-wider text-[#121210] hover:text-[#8C2C14] transition-colors"
          >
            View Department Catalog →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {magazines.map((item) => (
          <MagazineCard key={item.id} magazine={item} />
        ))}
      </div>
    </section>
  );
}
