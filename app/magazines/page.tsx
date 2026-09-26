import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getPublishedMagazines, getAcademicYears } from '@/lib/magazines';
import { getActiveDepartments } from '@/lib/departments';
import { ArchiveHeader } from '@/components/magazines/archive-header';
import { ArchiveFilters } from '@/components/magazines/archive-filters';
import { ArchiveResultsSection } from '@/components/magazines/archive-results-section';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Digital Magazine Archive | THE RKIVE',
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

  const hasActiveFilters = Boolean(
    searchParams.q || searchParams.department || searchParams.year
  );

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-12">
        {/* Header Section */}
        <ArchiveHeader totalCount={filteredMagazines.length} />

        {/* Real-time Filter & Search Toolbar (Suspense wrapped for SSR client search params) */}
        <Suspense
          fallback={
            <div className="h-28 rounded-sm bg-paper-100/80 border border-ink/15 animate-pulse mb-8" />
          }
        >
          <ArchiveFilters
            departments={departments}
            academicYears={academicYears}
          />
        </Suspense>

        {/* Publication Results Grid */}
        <ArchiveResultsSection
          magazines={filteredMagazines}
          hasActiveFilters={hasActiveFilters}
        />
      </main>

      <Footer />
    </div>
  );
}
