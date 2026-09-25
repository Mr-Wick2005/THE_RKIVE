import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getDepartmentBySlug } from '@/lib/departments';
import { getPublishedMagazinesByDepartment } from '@/lib/magazines';
import {
  DepartmentHeader,
  DepartmentMasthead,
  DepartmentPublicationsSection,
} from '@/components/departments';

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
      title: 'Department Not Found | THE RKIVE',
    };
  }
  return {
    title: `${department.name} Publications | THE RKIVE`,
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
    <div className="flex flex-col min-h-screen bg-transparent">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-12">
        {/* Navigation Breadcrumb */}
        <DepartmentHeader />

        {/* Department Masthead Banner */}
        <DepartmentMasthead
          department={department}
          publicationCount={magazines.length}
        />

        {/* Publications Catalog Section */}
        <DepartmentPublicationsSection
          department={department}
          magazines={magazines}
          currentSort={currentSort}
        />
      </main>

      <Footer />
    </div>
  );
}
