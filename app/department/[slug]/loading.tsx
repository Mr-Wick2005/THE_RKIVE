import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Skeleton, MagazineCardSkeleton } from '@/components/ui/loading-skeleton';

export default function DepartmentLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8F6F0]">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-12 space-y-8">
        <Skeleton className="h-4 w-36 mb-6" />

        {/* Department Banner Skeleton */}
        <div className="border border-ink/15 bg-paper-100/80 rounded-sm p-8 sm:p-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-2xl flex-1">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-96 max-w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="p-6 rounded-sm bg-paper-100 border border-ink/15 text-center min-w-[160px]">
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
              <Skeleton className="h-3 w-24 mx-auto" />
            </div>
          </div>
        </div>

        {/* Department Publications Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
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
