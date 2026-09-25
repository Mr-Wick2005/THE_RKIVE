import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getPublishedMagazineBySlug, getPublishedMagazinesByDepartment } from '@/lib/magazines';
import {
  MagazineDetailHeader,
  MagazineShowcase,
  MagazineRelatedSection,
} from '@/components/magazines';

export const revalidate = 60;

interface MagazinePageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: MagazinePageProps) {
  const magazine = await getPublishedMagazineBySlug(params.slug);
  if (!magazine) {
    return {
      title: 'Magazine Not Found | THE RKIVE',
    };
  }
  return {
    title: `${magazine.title} | ${magazine.department?.name || 'THE RKIVE'}`,
    description:
      magazine.description ||
      `Read ${magazine.title}, published by ${magazine.department?.name} (${magazine.academic_year}).`,
  };
}

export default async function MagazineDetailPage({ params }: MagazinePageProps) {
  const magazine = await getPublishedMagazineBySlug(params.slug);

  if (!magazine) {
    notFound();
  }

  // Fetch related issues from same department (excluding current)
  const departmentIssues = await getPublishedMagazinesByDepartment(magazine.department_id);
  const relatedIssues = departmentIssues.filter((m) => m.id !== magazine.id).slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-12">
        {/* Back Navigation & Breadcrumb */}
        <MagazineDetailHeader department={magazine.department} />

        {/* Magazine Feature Showcase Box */}
        <MagazineShowcase magazine={magazine} />

        {/* Related Department Publications */}
        <MagazineRelatedSection
          departmentName={magazine.department?.name}
          departmentSlug={magazine.department?.slug}
          magazines={relatedIssues}
        />
      </main>

      <Footer />
    </div>
  );
}
