import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function DepartmentHeader() {
  return (
    <div className="mb-8">
      <Link
        href="/#departments"
        className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold uppercase tracking-wider text-[#2E2B26] hover:text-[#121210] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>All Academic Faculties</span>
      </Link>
    </div>
  );
}
