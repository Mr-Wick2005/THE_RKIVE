import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-sm bg-[#E8E2D8]/60',
        className
      )}
      {...props}
    />
  );
}

export function MagazineCardSkeleton() {
  return (
    <div className="border border-[#E8E2D8] bg-white rounded-sm p-4 space-y-4 shadow-card">
      <Skeleton className="aspect-magazine w-full rounded-sm" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-[#F0EBE1]">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
