import React from 'react';
import Link from 'next/link';
import { Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReaderAwaitingReleaseProps {
  magazineTitle: string;
}

export function ReaderAwaitingRelease({ magazineTitle }: ReaderAwaitingReleaseProps) {
  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-[#FFFFFF] border border-[#2C2824]/20 rounded-sm p-8 shadow-md space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#121210]">
          Publication Awaiting Release
        </h1>
        <p className="text-sm sm:text-base text-[#2E2B26] leading-relaxed">
          <strong>&ldquo;{magazineTitle}&rdquo;</strong> is currently undergoing institutional editorial review and has not yet been published to the digital archive.
        </p>
        <div className="pt-4 border-t border-[#2C2824]/15">
          <Link href="/magazines">
            <Button variant="outline" size="md" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Public Archive</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
