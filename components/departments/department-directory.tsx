import React from 'react';
import { DepartmentWithStats } from '@/types/department';
import { DepartmentCard } from './department-card';

interface DepartmentDirectoryProps {
  departments: DepartmentWithStats[];
}

export function DepartmentDirectory({ departments }: DepartmentDirectoryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {departments.map((dept) => (
        <DepartmentCard key={dept.id} department={dept} />
      ))}
    </div>
  );
}
