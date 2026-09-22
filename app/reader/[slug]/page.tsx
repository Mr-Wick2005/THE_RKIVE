import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublishedMagazineBySlug, getMagazineBySlug } from '@/lib/magazines';
import { getMagazinePages } from '@/lib/magazines/pages';
import { getCurrentProfile } from '@/lib/auth/session';
import { DigitalMagazineReader } from '@/components/reader/digital-magazine-reader';
import { ArrowLeft, BookOpen, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReaderPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ReaderPageProps) {
  const magazine = await getPublishedMagazineBySlug(params.slug);
  if (!magazine) {
    return {
      title: 'Digital Reader | College Digital Magazine Archive',
    };
  }
  return {
    title: `Read: ${magazine.title} (${magazine.academic_year}) | College Digital Archive`,
    description: magazine.description || `Read ${magazine.title} on the College Digital Publication Archive.`,
    openGraph: {
      title: `${magazine.title} — Digital Publication`,
      description: magazine.subtitle || magazine.description || 'College Digital Magazine Archive',
      images: magazine.cover_image_url ? [{ url: magazine.cover_image_url }] : [],
    },
  };
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  // First attempt public fetch (status === 'PUBLISHED')
  let magazine = await getPublishedMagazineBySlug(params.slug);

  // If not publicly published, allow administrative preview if the user is authenticated
  if (!magazine) {
    const profile = await getCurrentProfile();
    if (profile && profile.is_active) {
      const anyMag = await getMagazineBySlug(params.slug);
      if (anyMag && (profile.role === 'SUPER_ADMIN' || anyMag.department_id === profile.department_id)) {
        magazine = anyMag;
      }
    }
  }

  if (!magazine) {
    notFound();
  }

  // If magazine exists but is not published and accessed without admin auth
  if (magazine.status !== 'PUBLISHED') {
    const profile = await getCurrentProfile();
    const isAdmin = profile && (profile.role === 'SUPER_ADMIN' || profile.department_id === magazine.department_id);

    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white border border-[#E8E2D8] rounded-sm p-8 shadow-editorial space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h1 className="font-serif text-xl font-semibold text-[#171717]">
              Publication Awaiting Release
            </h1>
            <p className="text-xs text-[#77736C] leading-relaxed">
              <strong>&ldquo;{magazine.title}&rdquo;</strong> is currently undergoing institutional editorial review and has not yet been published to the digital archive.
            </p>
            <div className="pt-4 border-t border-[#E8E2D8]">
              <Link href="/magazines">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Public Archive</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  // Fetch processed pages
  const pages = await getMagazinePages(magazine.id);

  // If no processed pages exist yet and processing is not complete
  if (pages.length === 0 && magazine.processing_status !== 'COMPLETED' && !magazine.cover_image_url) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-[#E8E2D8] rounded-sm p-8 shadow-editorial space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="font-serif text-xl font-semibold text-[#171717]">
            Pages Processing
          </h1>
          <p className="text-xs text-[#77736C] leading-relaxed">
            The high-resolution document pages for <strong>&ldquo;{magazine.title}&rdquo;</strong> are currently being rendered. Please refresh in a moment.
          </p>
          <div className="pt-4 border-t border-[#E8E2D8]">
            <Link href={`/magazine/${magazine.slug}`}>
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Publication Details</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <DigitalMagazineReader magazine={magazine} initialPages={pages} />;
}
