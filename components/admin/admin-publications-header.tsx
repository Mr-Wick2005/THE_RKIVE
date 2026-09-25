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
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#77736C]">
          <Link href="/admin/dashboard" className="hover:text-[#171717] transition-colors">
            Workspace
          </Link>
          <span>/</span>
          <span className="text-[#171717] font-semibold">Publications</span>
        </div>

        <h1 className="font-serif text-3xl font-medium tracking-tight text-[#171717]">
          {isSuper ? 'Institutional Publications Registry' : `${departmentName || 'Department'} Publications`}
        </h1>
        <p className="text-xs text-[#77736C] font-light">
          Manage draft editions, track review status, and prepare publications for college publication.
        </p>
      </div>

      <Link href="/admin/magazines/new">
        <Button variant="primary" size="md" className="gap-2 bg-[#171717] hover:bg-[#2C2C2A] shadow-sm">
          <PlusCircle className="w-4 h-4 text-[#B58A55]" />
          <span>Create Publication</span>
        </Button>
      </Link>
    </div>
  );
}
