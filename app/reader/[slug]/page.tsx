import React from 'react';
import { notFound } from 'next/navigation';
import { getPublishedMagazineBySlug, getMagazineBySlug } from '@/lib/magazines';
import { getMagazinePages } from '@/lib/magazines/pages';
import { getCurrentProfile } from '@/lib/auth/session';
import {
  DigitalMagazineReader,
  ReaderAwaitingRelease,
  ReaderProcessingState,
} from '@/components/reader';

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
      return <ReaderAwaitingRelease magazineTitle={magazine.title} />;
    }
  }

  // Fetch processed pages
  const pages = await getMagazinePages(magazine.id);

  // If no processed pages exist yet and processing is not complete
  if (pages.length === 0 && magazine.processing_status !== 'COMPLETED' && !magazine.cover_image_url) {
    return (
      <ReaderProcessingState
        magazineTitle={magazine.title}
        magazineSlug={magazine.slug}
      />
    );
  }

  return <DigitalMagazineReader magazine={magazine} initialPages={pages} />;
}
