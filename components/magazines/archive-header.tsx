import React from 'react';
import Link from 'next/link';

interface ArchiveHeaderProps {
  totalCount: number;
}

export function ArchiveHeader({ totalCount }: ArchiveHeaderProps) {
  return (
    <div className="border-b border-[#2C2824]/20 pb-8 mb-8 space-y-3">
      <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-[#2E2B26]">
        <Link href="/" className="hover:text-[#121210] transition-colors font-medium">
          Archive Home
        </Link>
        <span>/</span>
        <span className="text-[#121210] font-bold">Publications</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold tracking-tight text-[#121210]">
            Digital Magazine Archive
          </h1>
          <p className="text-base sm:text-lg text-[#2E2B26] max-w-2xl mt-2.5 font-normal leading-relaxed">
            Explore publications from departments across the college. Filter by academic discipline, volume edition, or publication year.
          </p>
        </div>

        <div className="flex-shrink-0">
          <span className="inline-block font-mono text-sm font-semibold text-[#121210] bg-[#F5EFEB]/90 border border-[#2C2824]/20 px-4 py-2.5 rounded-xs shadow-xs">
            Showing {totalCount} {totalCount === 1 ? 'Publication' : 'Publications'}
          </span>
        </div>
      </div>
    </div>
  );
}
