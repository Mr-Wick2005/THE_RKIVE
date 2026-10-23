import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface AdminPublicationsHeaderProps {
  isSuper: boolean;
  departmentName?: string;
}

export function AdminPublicationsHeader({
  isSuper,
  departmentName,
}: AdminPublicationsHeaderProps) {
  return (
    <div className="border-b border-[#E8E2D8] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#55524D]">
          <Link href="/admin/dashboard" className="hover:text-[#171717] transition-colors">
            Workspace
          </Link>
          <span>/</span>
          <span className="text-[#171717] font-semibold">Publications</span>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-[#171717]">
          {isSuper ? 'Institutional Publications Registry' : `${departmentName || 'Department'} Publications`}
        </h1>
        <p className="text-sm text-[#55524D] font-normal leading-relaxed">
          Manage draft editions, track review status, and prepare publications for college publication.
        </p>
      </div>

      <Link href="/admin/magazines/new" className="inline-flex shrink-0">
        <Button variant="primary" size="md" className="gap-2 bg-[#171717] hover:bg-[#2C2C2A] shadow-sm text-sm font-medium px-4 min-h-[42px]">
          <PlusCircle className="w-4 h-4 text-[#B58A55]" />
          <span>Create Publication</span>
        </Button>
      </Link>
    </div>
  );
}
