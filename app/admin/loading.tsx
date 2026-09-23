import { Skeleton } from '@/components/ui/loading-skeleton';

export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Editorial Desk Banner Skeleton */}
      <div className="border border-[#E8E2D8] bg-white rounded-sm p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      {/* KPI Stats Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 bg-white border border-[#E8E2D8] rounded-sm space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="p-5 bg-white border border-[#E8E2D8] rounded-sm space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="p-5 bg-white border border-[#E8E2D8] rounded-sm space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="p-5 bg-white border border-[#E8E2D8] rounded-sm space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Content Section Skeleton */}
      <div className="border border-[#E8E2D8] bg-white rounded-sm p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-[#F0EBE1]">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="space-y-3 pt-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
