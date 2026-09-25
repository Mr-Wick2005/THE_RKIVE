import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Department } from '@/types/department';

interface MagazineDetailHeaderProps {
  department?: Department | null;
}

export function MagazineDetailHeader({ department }: MagazineDetailHeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <Link
        href="/magazines"
        className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold uppercase tracking-wider text-[#2E2B26] hover:text-[#121210] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Archive</span>
      </Link>

      {department && (
        <Link
          href={`/department/${department.slug}`}
          className="text-sm sm:text-base uppercase tracking-wider font-mono font-bold text-[#8C2C14] hover:underline transition-colors"
        >
          {department.name} →
        </Link>
      )}
    </div>
  );
}
