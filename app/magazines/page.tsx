import Link from 'next/link';
import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getPublishedMagazines, getAcademicYears } from '@/lib/magazines';
import { getActiveDepartments } from '@/lib/departments';
import { MagazineGrid } from '@/components/magazines/magazine-grid';
import { ArchiveFilters } from '@/components/magazines/archive-filters';
import { MagazineCardSkeleton } from '@/components/ui/loading-skeleton';
import { Sparkles, BookOpen } from 'lucide-react';

export const revalidate = 60;

export const metadata = {
  title: 'Digital Magazine Archive | Athenaeum',
  description:
    'Complete public publication archive. Search and filter peer-reviewed magazines, symposium proceedings, and research journals across all departments.',
};

interface MagazinesPageProps {
  searchParams: {
    q?: string;
    department?: string;
    year?: string;
    sort?: 'latest' | 'oldest' | 'title_asc';
  };
}

export default async function MagazinesArchivePage({ searchParams }: MagazinesPageProps) {
  const [departments, academicYears, filteredMagazines] = await Promise.all([
    getActiveDepartments(),
    getAcademicYears(),
    getPublishedMagazines({
      query: searchParams.q,
      departmentSlug: searchParams.department,
      academicYear: searchParams.year,
      sort: searchParams.sort || 'latest',
    }),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F6F1]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-12">
        {/* Header Section */}
        <div className="border-b border-[#E8E2D8] pb-8 mb-8 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#77736C]">
            <Link href="/" className="hover:text-[#171717] transition-colors">
              Archive Home
            </Link>
            <span>/</span>
            <span className="text-[#171717] font-semibold">Publications</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-[#171717]">
                Digital Magazine Archive
              </h1>
              <p className="text-xs sm:text-sm text-[#77736C] max-w-2xl mt-2 font-light leading-relaxed">
                Explore publications from departments across the college. Filter by academic discipline, volume edition, or publication year.
              </p>
            </div>

            <div className="flex-shrink-0">
              <span className="inline-block font-mono text-xs text-[#44423E] bg-white border border-[#E8E2D8] px-3 py-1.5 rounded-sm shadow-sm">
                Showing {filteredMagazines.length} {filteredMagazines.length === 1 ? 'Publication' : 'Publications'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Filter & Search Toolbar (Suspense wrapped for SSR client search params) */}
        <Suspense
          fallback={
            <div className="h-28 rounded-sm bg-white border border-[#E8E2D8] animate-pulse mb-8" />
          }
        >
          <ArchiveFilters
            departments={departments}
            academicYears={academicYears}
          />
        </Suspense>

        {/* Publication Results Grid */}
        <section aria-label="Magazine Results">
          <MagazineGrid
            magazines={filteredMagazines}
            emptyType={searchParams.q || searchParams.department || searchParams.year ? 'search' : 'magazines'}
            emptyMessage={
              searchParams.q || searchParams.department || searchParams.year
                ? 'No published magazines match your active search and filter criteria.'
                : 'No digital magazines have been approved and published to the public archive yet.'
            }
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
