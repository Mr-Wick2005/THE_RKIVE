import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getDepartmentsWithStats } from '@/lib/departments';
import { getPublishedMagazines, getFeaturedMagazines } from '@/lib/magazines';
import { HeroComposition } from '@/components/magazines/hero-composition';
import { MagazineGrid } from '@/components/magazines/magazine-grid';
import { MagazineShelf } from '@/components/magazines/magazine-shelf';
import { DepartmentDirectory } from '@/components/departments/department-directory';
import { SectionHeading } from '@/components/ui/section-heading';
import { BookOpen, Layers, Sparkles, ShieldCheck, Library, BookmarkCheck, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Athenaeum — College Digital Magazine Archive & Publications',
  description:
    'Explore peer-reviewed digital magazines, engineering symposium journals, and student capstone periodicals from all academic departments.',
};

export default async function HomePage() {
  const departmentsWithStats = await getDepartmentsWithStats();
  const allPublished = await getPublishedMagazines();
  const featuredMagazines = await getFeaturedMagazines(4);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F6F1]">
      <Header />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 1. EDITORIAL HERO SECTION                                                  */}
        {/* ========================================================================= */}
        <section className="border-b border-[#E8E2D8] bg-[#F8F6F1] pt-12 pb-20 px-6 sm:px-10 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Typography & CTAs */}
              <div className="lg:col-span-6 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-[#E8E2D8]/80 border border-[#DCD5C9] text-[10px] font-mono tracking-widest uppercase text-[#44423E]">
                  <Sparkles className="w-3 h-3 text-[#B58A55]" />
                  <span>College Digital Publication Archive</span>
                </div>

                <h1 className="font-serif text-4xl sm:text-6xl xl:text-7xl font-medium tracking-tight text-[#171717] leading-[1.08]">
                  Ideas. Stories. Research. Creativity.
                </h1>

                <p className="text-sm sm:text-base text-[#77736C] max-w-xl font-light leading-relaxed">
                  Explore the digital magazines, engineering periodicals, capstone proceedings, and creative scholarship produced across our college academic community.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    href="/magazines"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-[#171717] text-[#F8F6F1] text-xs font-semibold uppercase tracking-wider hover:bg-[#2C2C2A] transition-all shadow-md group"
                  >
                    <BookOpen className="w-4 h-4 text-[#B58A55]" />
                    <span>Explore Magazines</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#departments"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-sm border border-[#E8E2D8] bg-white text-[#171717] text-xs font-semibold uppercase tracking-wider hover:bg-[#F0EBE1] hover:border-[#DCD5C9] transition-all shadow-sm"
                  >
                    <Layers className="w-4 h-4 text-[#77736C]" />
                    <span>Browse Departments</span>
                  </a>
                </div>

                {/* Micro Stat Badges */}
                <div className="pt-6 border-t border-[#E8E2D8]/80 flex items-center gap-8 text-xs text-[#77736C]">
                  <div>
                    <span className="block font-serif text-xl sm:text-2xl font-semibold text-[#171717]">
                      {departmentsWithStats.length}
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider">
                      Academic Faculties
                    </span>
                  </div>
                  <div className="h-8 w-px bg-[#E8E2D8]" />
                  <div>
                    <span className="block font-serif text-xl sm:text-2xl font-semibold text-[#171717]">
                      {allPublished.length}+
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider">
                      Published Editions
                    </span>
                  </div>
                  <div className="h-8 w-px bg-[#E8E2D8]" />
                  <div>
                    <span className="block font-serif text-xl sm:text-2xl font-semibold text-[#171717]">
                      100%
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider">
                      Peer Governed
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Layered 3D Physical Magazine Composition */}
              <div className="lg:col-span-6 flex justify-center items-center">
                <HeroComposition magazines={allPublished} />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. FEATURED PUBLICATIONS SECTION                                           */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-6 sm:px-10 py-20">
          <SectionHeading
            eyebrow="Curated Publications"
            title="Featured Issues"
            subtitle="The latest peer-reviewed digital magazines and research journals released by academic departments."
            linkHref="/magazines"
            linkLabel="View All Archive Issues"
          />

          <MagazineGrid
            magazines={featuredMagazines}
            emptyMessage="New magazine editions are currently under peer review."
          />
        </section>

        {/* ========================================================================= */}
        {/* 3. SIGNATURE DIGITAL BOOKSHELF                                             */}
        {/* ========================================================================= */}
        <section id="bookshelf" className="border-y border-[#E8E2D8] bg-[#F0EBE1] py-20 px-6 sm:px-10 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <SectionHeading
              eyebrow="Interactive Browsing"
              title="The Digital Bookshelf"
              subtitle="Browse through recent college publications as physical volumes. Hover or click to explore individual issues."
              linkHref="/magazines"
              linkLabel="Full Catalog"
            />

            <MagazineShelf magazines={allPublished} />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. EXPLORE BY DEPARTMENT DIRECTORY                                         */}
        {/* ========================================================================= */}
        <section id="departments" className="max-w-7xl mx-auto px-6 sm:px-10 py-20">
          <SectionHeading
            eyebrow="Academic Directory"
            title="Explore by Department"
            subtitle="Each department maintains its own editorial board, publishing student capstones, engineering breakthroughs, and annual reviews."
            align="left"
          />

          <DepartmentDirectory departments={departmentsWithStats} />
        </section>

        {/* ========================================================================= */}
        {/* 5. ARCHIVE MISSION & ACADEMIC INTEGRITY MANIFESTO                          */}
        {/* ========================================================================= */}
        <section className="border-t border-[#E8E2D8] bg-white py-20 px-6 sm:px-10">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-[#F8F6F1] border border-[#E8E2D8] flex items-center justify-center mx-auto text-[#B58A55]">
              <Library className="w-6 h-6" />
            </div>

            <span className="text-[11px] font-mono uppercase tracking-widest text-[#B58A55] block">
              Editorial Governance & Archival Mission
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#171717] max-w-3xl mx-auto">
              Preserving Collegiate Scholarship & Departmental Legacy
            </h2>

            <p className="text-xs sm:text-sm text-[#77736C] max-w-2xl mx-auto leading-relaxed font-light">
              Athenaeum serves as the permanent digital repository for our college institution. Every edition is authenticated by faculty editorial advisors, securely indexed with PostgreSQL Row Level Security, and made freely accessible for global academic inquiry.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[#171717]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span className="font-medium">Faculty Reviewed</span>
              </div>
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-[#B58A55]" />
                <span className="font-medium">Permanent Digital Records</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#171717]" />
                <span className="font-medium">Open Academic Access</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
