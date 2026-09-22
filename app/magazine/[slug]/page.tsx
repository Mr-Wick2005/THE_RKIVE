import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getPublishedMagazineBySlug, getPublishedMagazinesByDepartment } from '@/lib/magazines';
import { MagazineCover } from '@/components/magazines/magazine-cover';
import { MagazineCard } from '@/components/magazines/magazine-card';
import { ShareButton } from '@/components/magazines/share-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import {
  BookOpen,
  Calendar,
  FileText,
  ArrowLeft,
  ShieldCheck,
  Building2,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';

interface MagazinePageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: MagazinePageProps) {
  const magazine = await getPublishedMagazineBySlug(params.slug);
  if (!magazine) {
    return {
      title: 'Magazine Not Found | Athenaeum Archive',
    };
  }
  return {
    title: `${magazine.title} | ${magazine.department?.name || 'College Archive'}`,
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
    <div className="flex flex-col min-h-screen bg-[#F8F6F1]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-12">
        {/* Back Navigation & Breadcrumb */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/magazines"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#77736C] hover:text-[#171717] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Archive</span>
          </Link>

          {magazine.department && (
            <Link
              href={`/department/${magazine.department.slug}`}
              className="text-xs uppercase tracking-widest font-mono text-[#77736C] hover:text-[#B58A55] transition-colors"
            >
              {magazine.department.name} →
            </Link>
          )}
        </div>

        {/* Magazine Feature Showcase Box */}
        <article className="border border-[#E8E2D8] bg-white rounded-sm shadow-editorial p-8 sm:p-12 lg:p-16 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Dominant Physical Magazine Cover */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative group/showcase perspective-[1200px] w-full max-w-[340px] sm:max-w-[380px]">
                <div className="shadow-2xl hover:shadow-magazine-hover transition-all duration-300 rounded-sm">
                  <MagazineCover
                    magazine={magazine}
                    size="hero"
                    className="w-full"
                    priority
                  />
                </div>

                {/* Subtle paper reflection line */}
                <div className="mt-4 text-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#77736C]">
                    Volume Edition • {magazine.academic_year}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Title, Synopsis, Metadata, and CTAs */}
            <div className="lg:col-span-7 space-y-6">
              {/* Department & Status Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/department/${magazine.department?.slug}`}>
                  <Badge variant="department">
                    {magazine.department?.name || 'Departmental Journal'}
                  </Badge>
                </Link>
                <Badge variant="outline" className="font-mono">
                  {magazine.academic_year}
                </Badge>
                <div className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Peer-Reviewed Publication</span>
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#171717] leading-tight">
                  {magazine.title}
                </h1>
                {magazine.subtitle && (
                  <p className="font-serif text-lg sm:text-xl text-[#B58A55] italic font-normal">
                    {magazine.subtitle}
                  </p>
                )}
              </div>

              {/* Synopsis / Abstract */}
              <div className="space-y-2 pt-2 border-t border-[#F0EBE1]">
                <h3 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#171717]">
                  Editorial Synopsis & Abstract
                </h3>
                <p className="text-sm text-[#44423E] leading-relaxed font-light">
                  {magazine.description ||
                    'This digital magazine features faculty capstone research, student editorial essays, departmental achievements, and technical project showcases.'}
                </p>
              </div>

              {/* Detailed Publication Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-sm bg-[#F8F6F1] border border-[#E8E2D8] text-xs font-mono">
                <div>
                  <span className="block text-[10px] text-[#77736C] uppercase">Edition</span>
                  <span className="font-semibold text-[#171717] mt-0.5 block">
                    {magazine.edition || 'Annual Issue'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#77736C] uppercase">Volume</span>
                  <span className="font-semibold text-[#171717] mt-0.5 block">
                    {magazine.volume || 'Vol. 1'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#77736C] uppercase">Length</span>
                  <span className="font-semibold text-[#171717] mt-0.5 block">
                    {magazine.page_count} Pages
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#77736C] uppercase">Published</span>
                  <span className="font-semibold text-[#171717] mt-0.5 block">
                    {formatDate(magazine.published_at)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link href={`/reader/${magazine.slug}`} className="flex-1 sm:flex-initial">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto gap-2 bg-[#171717] text-[#F8F6F1] hover:bg-[#2C2C2A]"
                  >
                    <BookOpen className="w-4 h-4 text-[#B58A55]" />
                    <span>Read Magazine</span>
                  </Button>
                </Link>

                <ShareButton title={magazine.title} />
              </div>
            </div>
          </div>
        </article>

        {/* Related Department Publications */}
        {relatedIssues.length > 0 && (
          <section className="space-y-8">
            <div className="border-b border-[#E8E2D8] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B58A55] block">
                  More from {magazine.department?.name}
                </span>
                <h3 className="font-serif text-2xl font-medium text-[#171717] mt-1">
                  Department Archival Issues
                </h3>
              </div>
              <Link
                href={`/department/${magazine.department?.slug}`}
                className="text-xs uppercase tracking-wider font-semibold text-[#171717] hover:text-[#B58A55] transition-colors"
              >
                View Department Catalog →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {relatedIssues.map((item) => (
                <MagazineCard key={item.id} magazine={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
