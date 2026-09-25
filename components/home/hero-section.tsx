import React from 'react';
import Link from 'next/link';
import { BookOpen, Layers, Sparkles, ArrowRight } from 'lucide-react';
import { HeroComposition } from '@/components/magazines/hero-composition';
import { Magazine } from '@/types/magazine';

interface HeroSectionProps {
  departmentsCount: number;
  publishedCount: number;
  magazines: Magazine[];
}

export function HeroSection({
  departmentsCount,
  publishedCount,
  magazines,
}: HeroSectionProps) {
  return (
    <section className="border-b-2 border-[#1A1A1A] bg-transparent pt-12 pb-20 px-6 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Typography & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-[#1A1A1A] leading-[1.08]">
              <span className="block">Welcome to</span>
              <span className="block">THE RKIVE</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#3E3C38] max-w-xl font-normal leading-relaxed">
              Explore the digital magazines, engineering periodicals, capstone proceedings, and creative scholarship produced across our college academic community.
            </p>

            <div className="pt-2 flex flex-row flex-wrap items-center gap-4">
              <Link
                href="/magazines"
                className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 bg-[#1A1A1A] text-[#FAF7F2] text-sm sm:text-base font-bold uppercase tracking-wider hover:bg-[#1B44B8] border-2 border-[#1A1A1A] hover:border-[#1B44B8] shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#1B44B8] transition-all group whitespace-nowrap"
              >
                <BookOpen className="w-5 h-5 text-[#FAF7F2]" />
                <span>Explore Magazines</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#departments"
                className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-[#1A1A1A] text-sm sm:text-base font-bold uppercase tracking-wider hover:bg-[#FAF7F2] shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#C24A26] transition-all whitespace-nowrap"
              >
                <Layers className="w-5 h-5 text-[#1A1A1A]" />
                <span>Browse Departments</span>
              </a>
            </div>

            {/* Micro Stat Badges */}
            <div className="pt-8 border-t-2 border-[#1A1A1A] flex items-center gap-8 sm:gap-12 text-[#1A1A1A]">
              <div>
                <span className="block font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A]">
                  {departmentsCount}
                </span>
                <span className="text-xs sm:text-sm uppercase font-mono font-bold tracking-wider text-[#1A1A1A] mt-1 block">
                  Academic Faculties
                </span>
              </div>
              <div className="h-10 w-0.5 bg-[#1A1A1A]" />
              <div>
                <span className="block font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A]">
                  {publishedCount}+
                </span>
                <span className="text-xs sm:text-sm uppercase font-mono font-bold tracking-wider text-[#1A1A1A] mt-1 block">
                  Published Editions
                </span>
              </div>
              <div className="h-10 w-0.5 bg-[#1A1A1A]" />
              <div>
                <span className="block font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A]">
                  100%
                </span>
                <span className="text-xs sm:text-sm uppercase font-mono font-bold tracking-wider text-[#1A1A1A] mt-1 block">
                  Peer Governed
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Layered 3D Physical Magazine Composition */}
          <div className="lg:col-span-6 flex justify-center items-center -translate-y-10">
            <HeroComposition magazines={magazines} />
          </div>
        </div>
      </div>
    </section>
  );
}
