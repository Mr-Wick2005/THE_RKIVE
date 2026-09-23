import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Skeleton, MagazineCardSkeleton } from '@/components/ui/loading-skeleton';

export default function MagazineDetailLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8F6F1]">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-12 space-y-12">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Feature showcase skeleton */}
        <div className="border border-[#E8E2D8] bg-white rounded-sm p-8 sm:p-12 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-5 flex justify-center">
              <Skeleton className="aspect-magazine w-full max-w-[340px] rounded-sm shadow-editorial" />
            </div>
            <div className="lg:col-span-7 space-y-6">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-12 w-full max-w-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <div className="flex gap-4 pt-4">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-12 w-32" />
              </div>
            </div>
          </div>
        </div>

        {/* Related issues skeleton */}
        <div className="space-y-6 pt-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
