import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-sm bg-ink/10',
        className
      )}
      {...props}
    />
  );
}

export function MagazineCardSkeleton() {
  return (
    <div className="border border-ink/15 bg-paper-100/70 rounded-sm p-4 space-y-4 shadow-card">
      <Skeleton className="aspect-magazine w-full rounded-sm" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-ink/10">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
