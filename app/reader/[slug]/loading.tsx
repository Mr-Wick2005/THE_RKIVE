import { Skeleton } from '@/components/ui/loading-skeleton';
import { BookOpen } from 'lucide-react';

export default function ReaderLoading() {
  return (
    <div className="min-h-screen bg-[#1F1E1B] flex flex-col">
      {/* Top Reader Bar Skeleton */}
      <div className="h-14 border-b border-white/10 bg-[#171717] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 bg-white/10" />
          <Skeleton className="h-5 w-48 bg-white/10" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 bg-white/10" />
          <Skeleton className="h-8 w-8 bg-white/10" />
          <Skeleton className="h-8 w-8 bg-white/10" />
        </div>
      </div>

      {/* Main Reader Spread Skeleton */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center gap-4">
            <Skeleton className="h-[580px] w-[410px] max-w-[45vw] bg-white/5 rounded-xs shadow-2xl" />
            <Skeleton className="h-[580px] w-[410px] max-w-[45vw] bg-white/5 rounded-xs shadow-2xl hidden md:block" />
          </div>
          <div className="flex items-center gap-2 text-stone-400 text-xs font-mono">
            <BookOpen className="w-4 h-4 animate-pulse text-[#B58A55]" />
            <span>Loading Digital Edition...</span>
          </div>
        </div>
      </main>

      {/* Bottom Toolbar Skeleton */}
      <div className="h-12 border-t border-white/10 bg-[#171717] px-6 flex items-center justify-center gap-6">
        <Skeleton className="h-7 w-20 bg-white/10" />
        <Skeleton className="h-7 w-32 bg-white/10" />
        <Skeleton className="h-7 w-20 bg-white/10" />
      </div>
    </div>
  );
}
