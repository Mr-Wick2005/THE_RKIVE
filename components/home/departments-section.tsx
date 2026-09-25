import React from 'react';
import { SectionHeading } from '@/components/ui/section-heading';
import { DepartmentDirectory } from '@/components/departments/department-directory';
import { DepartmentWithStats } from '@/types/department';

interface DepartmentsSectionProps {
  departments: DepartmentWithStats[];
}

export function DepartmentsSection({ departments }: DepartmentsSectionProps) {
  return (
    <section id="departments" className="border-t-2 border-[#1A1A1A] max-w-7xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
      <SectionHeading
        eyebrow="Academic Directory"
        title="Explore by Department"
        subtitle="Each department maintains its own editorial board, publishing student capstones, engineering breakthroughs, and annual reviews."
        align="left"
      />

      <DepartmentDirectory departments={departments} />
    </section>
  );
}
