import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getDepartmentsWithStats } from '@/lib/departments';
import { getPublishedMagazines } from '@/lib/magazines';
import {
  HeroSection,
  NewlyPublishedSection,
  DepartmentsSection,
  AboutUsSection,
} from '@/components/home';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'THE RKIVE — College Digital Magazine Archive & Publications',
  description:
    'Explore peer-reviewed digital magazines, engineering symposium journals, and student capstone periodicals from all academic departments.',
};

export default async function HomePage() {
  const [departmentsWithStats, allPublished] = await Promise.all([
    getDepartmentsWithStats(),
    getPublishedMagazines(),
  ]);
  const newlyPublished = allPublished.slice(0, 4);

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Header />

      <main className="flex-1">
        {/* 1. Home / Hero */}
        <HeroSection
          departmentsCount={departmentsWithStats.length}
          publishedCount={allPublished.length}
          magazines={allPublished}
        />

        {/* 2. Newly Published */}
        <NewlyPublishedSection magazines={newlyPublished} />

        {/* 3. Explore by Department */}
        <DepartmentsSection departments={departmentsWithStats} />

        {/* 4. About Us */}
        <AboutUsSection />
      </main>

      <Footer />
    </div>
  );
}
