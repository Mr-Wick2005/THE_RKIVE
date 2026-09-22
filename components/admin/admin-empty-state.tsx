import React from 'react';
import Link from 'next/link';
import { BookOpen, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminEmptyStateProps {
  title?: string;
  description?: string;
  createHref?: string;
}

export function AdminEmptyState({
  title = 'No publications in your workspace',
  description = 'Your department has not created any digital magazine editions yet. Begin by drafting your inaugural edition.',
  createHref = '/admin/magazines/new',
}: AdminEmptyStateProps) {
  return (
    <div className="border border-[#E8E2D8] bg-white rounded-sm p-12 sm:p-16 text-center space-y-4 max-w-xl mx-auto shadow-sm my-6">
      <div className="w-14 h-14 rounded-full bg-[#F8F6F1] border border-[#E8E2D8] flex items-center justify-center mx-auto text-[#B58A55]">
        <BookOpen className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="font-serif text-xl font-medium text-[#171717]">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-[#77736C] max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {createHref && (
        <div className="pt-2">
          <Link href={createHref}>
            <Button variant="primary" size="md" className="gap-2 bg-[#171717] hover:bg-[#2C2C2A]">
              <PlusCircle className="w-4 h-4 text-[#B58A55]" />
              <span>Create New Publication</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
