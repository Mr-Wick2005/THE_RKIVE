import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';

export function AboutUsSection() {
  return (
    <section id="about-us" className="border-t-2 border-[#1A1A1A] bg-transparent py-16 sm:py-24 px-6 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left Column: Clean, Elegant Info about THE RKIVE */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-widest text-[#C24A26] block">
                Editorial Archive & Mission
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A1A] leading-tight tracking-tight">
                About THE RKIVE
              </h2>
            </div>

            <div className="w-16 h-0.5 bg-[#1A1A1A]" />

            <div className="space-y-4 text-base sm:text-lg text-[#3E3C38] font-normal leading-relaxed">
              <p>
                <strong>THE RKIVE</strong> is our collegiate digital publishing platform and academic repository. We curate and preserve peer-reviewed departmental magazines, engineering periodicals, symposium capstones, and creative scholarship across all academic faculties.
              </p>
              <p>
                Governed under faculty advisory and student editorial oversight, every publication is archived with institutional permanence, high visual craftsmanship, and open academic accessibility.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/magazines"
                className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#1A1A1A] text-[#FAF7F2] text-sm font-bold uppercase tracking-wider hover:bg-[#1B44B8] border-2 border-[#1A1A1A] hover:border-[#1B44B8] shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#1B44B8] transition-all group"
              >
                <BookOpen className="w-4 h-4 text-[#FAF7F2]" />
                <span>Explore the Archive</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Right Column: Framed RKIVE Painting Artwork (Clean, no text on card) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-lg cutout-card cutout-card-tape hover-lift-blue p-3 sm:p-4 bg-[#F4EFEB]">
              {/* Inner Art Frame / Canvas */}
              <div className="relative aspect-square w-full border-2 border-[#1A1A1A] overflow-hidden bg-[#EAE3D7] group">
                <Image
                  src="/images/rkive-painting.jpg"
                  alt="The Rkive Editorial Artwork"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


