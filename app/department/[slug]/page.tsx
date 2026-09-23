import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getDepartmentBySlug } from '@/lib/departments';
import { getPublishedMagazinesByDepartment } from '@/lib/magazines';
import { MagazineGrid } from '@/components/magazines/magazine-grid';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Layers, Sparkles, Building2 } from 'lucide-react';

interface DepartmentPageProps {
  params: {
    slug: string;
  };
  searchParams?: {
    sort?: 'latest' | 'oldest' | 'title_asc';
  };
}

export const revalidate = 60;

export async function generateMetadata({ params }: DepartmentPageProps) {
  const department = await getDepartmentBySlug(params.slug);
  if (!department) {
    return {
      title: 'Department Not Found | Athenaeum Archive',
    };
  }
  return {
    title: `${department.name} Publications | Athenaeum Digital Archive`,
    description:
      department.description ||
      `Explore digital magazines, annual research journals, and capstones from the ${department.name} department.`,
  };
}

export default async function DepartmentDetailPage({
  params,
  searchParams = {},
}: DepartmentPageProps) {
  const department = await getDepartmentBySlug(params.slug);

  if (!department) {
    notFound();
  }

  const currentSort = searchParams.sort || 'latest';
  const magazines = await getPublishedMagazinesByDepartment(department.id, currentSort);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F6F1]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/#departments"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#77736C] hover:text-[#171717] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Departments</span>
          </Link>
        </div>

        {/* Department Masthead Banner */}
        <header className="border border-[#E8E2D8] bg-white rounded-sm p-8 sm:p-12 mb-12 shadow-editorial">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-sm bg-[#F0EBE1] text-[#171717] border border-[#E8E2D8]">
                  {department.short_name}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Academic Faculty
                </Badge>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-[#171717]">
                {department.name}
              </h1>

              <p className="text-xs sm:text-sm text-[#77736C] leading-relaxed font-light">
                {department.description ||
                  'Departmental research proceedings, annual periodicals, and student engineering capstone showcases.'}
              </p>
            </div>

            {/* Publication Count Box */}
            <div className="p-6 rounded-sm bg-[#F8F6F1] border border-[#E8E2D8] text-center min-w-[180px] flex-shrink-0">
              <span className="block font-serif text-3xl font-semibold text-[#171717]">
                {magazines.length}
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#77736C] mt-1 block">
                {magazines.length === 1 ? 'Published Issue' : 'Published Issues'}
              </span>
            </div>
          </div>
        </header>

        {/* Publications Catalog Section */}
        <section className="space-y-8">
          <div className="border-b border-[#E8E2D8] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B58A55] block">
                Official Catalog
              </span>
              <h2 className="font-serif text-2xl font-medium text-[#171717] mt-1">
                Departmental Publications ({magazines.length})
              </h2>
            </div>

            {/* Simple Sort Options */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#77736C] font-mono text-[11px] uppercase">Sort:</span>
              <Link
                href={`/department/${department.slug}?sort=latest`}
                className={`px-2.5 py-1 rounded-sm border ${
                  currentSort === 'latest'
                    ? 'bg-[#171717] text-[#F8F6F1] border-[#171717]'
                    : 'bg-white text-[#44423E] border-[#E8E2D8] hover:bg-[#F0EBE1]'
                }`}
              >
                Latest
              </Link>
              <Link
                href={`/department/${department.slug}?sort=oldest`}
                className={`px-2.5 py-1 rounded-sm border ${
                  currentSort === 'oldest'
                    ? 'bg-[#171717] text-[#F8F6F1] border-[#171717]'
                    : 'bg-white text-[#44423E] border-[#E8E2D8] hover:bg-[#F0EBE1]'
                }`}
              >
                Oldest
              </Link>
              <Link
                href={`/department/${department.slug}?sort=title_asc`}
                className={`px-2.5 py-1 rounded-sm border ${
                  currentSort === 'title_asc'
                    ? 'bg-[#171717] text-[#F8F6F1] border-[#171717]'
                    : 'bg-white text-[#44423E] border-[#E8E2D8] hover:bg-[#F0EBE1]'
                }`}
              >
                A–Z
              </Link>
            </div>
          </div>

          <MagazineGrid
            magazines={magazines}
            emptyType="department"
            emptyMessage={`The ${department.name} department has not published an approved digital magazine edition yet.`}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
