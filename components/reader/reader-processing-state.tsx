import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReaderProcessingStateProps {
  magazineTitle: string;
  magazineSlug: string;
}

export function ReaderProcessingState({
  magazineTitle,
  magazineSlug,
}: ReaderProcessingStateProps) {
  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-[#FFFFFF] border border-[#2C2824]/20 rounded-sm p-8 shadow-md space-y-4">
        <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-center mx-auto">
          <BookOpen className="w-7 h-7 animate-pulse" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#121210]">
          Pages Processing
        </h1>
        <p className="text-sm sm:text-base text-[#2E2B26] leading-relaxed">
          The high-resolution document pages for <strong>&ldquo;{magazineTitle}&rdquo;</strong> are currently being rendered. Please refresh in a moment.
        </p>
        <div className="pt-4 border-t border-[#2C2824]/15">
          <Link href={`/magazine/${magazineSlug}`}>
            <Button variant="outline" size="md" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Publication Details</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
