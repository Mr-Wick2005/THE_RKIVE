import React from 'react';
import { SectionHeading } from '@/components/ui/section-heading';
import { DepartmentDirectory } from '@/components/departments/department-directory';
import { DepartmentWithStats } from '@/types/department';
import { DepartmentsShowcaseConfig } from '@/types/cms';

interface DepartmentsSectionProps {
  departments: DepartmentWithStats[];
  config?: DepartmentsShowcaseConfig;
}

export function DepartmentsSection({ departments, config }: DepartmentsSectionProps) {
  if (config?.is_visible === false) return null;

  const eyebrow = config?.eyebrow || 'Academic Directory';
  const title = config?.title || 'Explore by Department';
  const subtitle =
    config?.subtitle ||
    'Each department maintains its own editorial board, publishing student capstones, engineering breakthroughs, and annual reviews.';

  // Apply custom overrides if configured in CMS
  const customizedDepartments = departments.map((dept) => {
    const override = config?.department_overrides?.[dept.id];
    if (!override) return dept;
    return {
      ...dept,
      name: override.display_label || dept.name,
      description: override.custom_description || dept.description,
    };
  });

  return (
    <section id="departments" className="border-t-2 border-[#1A1A1A] max-w-7xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        align="left"
      />

      <DepartmentDirectory departments={customizedDepartments} />
    </section>
  );
}
