import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Skeleton, MagazineCardSkeleton } from '@/components/ui/loading-skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8F6F1]">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-12 space-y-12">
        {/* Editorial Hero Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-8">
          <div className="lg:col-span-6 space-y-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-16 w-full max-w-md" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-11 w-40" />
              <Skeleton className="h-11 w-44" />
            </div>
          </div>
          <div className="lg:col-span-6 flex justify-center">
            <Skeleton className="h-96 w-64 rounded-sm shadow-editorial" />
          </div>
        </div>

        {/* Featured Publications Grid Skeleton */}
        <div className="space-y-6 pt-8 border-t border-[#E8E2D8]">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MagazineCardSkeleton />
            <MagazineCardSkeleton />
            <MagazineCardSkeleton />
            <MagazineCardSkeleton />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
