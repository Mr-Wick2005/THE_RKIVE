import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Skeleton, MagazineCardSkeleton } from '@/components/ui/loading-skeleton';

export default function MagazinesLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8F6F0]">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-12 space-y-8">
        <div className="border-b border-ink/15 pb-8 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        {/* Filter bar skeleton */}
        <div className="h-20 bg-paper-100/80 border border-ink/15 rounded-sm p-4 flex gap-4 items-center">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          <MagazineCardSkeleton />
          <MagazineCardSkeleton />
          <MagazineCardSkeleton />
          <MagazineCardSkeleton />
          <MagazineCardSkeleton />
          <MagazineCardSkeleton />
          <MagazineCardSkeleton />
          <MagazineCardSkeleton />
        </div>
      </main>
      <Footer />
    </div>
  );
}
