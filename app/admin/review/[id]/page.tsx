import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/session';
import { AdminHeader } from '@/components/layout/admin-header';
import { ReviewWorkspace } from '@/components/admin/review-workspace';
import { getMagazineForReview } from '@/lib/magazines/admin';

interface ReviewDetailPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ReviewDetailPageProps) {
  const magazine = await getMagazineForReview(params.id);
  return {
    title: magazine ? `Review: ${magazine.title} | College Digital Magazine` : 'Publication Review',
  };
}

export default async function AdminReviewDetailPage({ params }: ReviewDetailPageProps) {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    redirect('/admin/login');
  }

  // Super Admin check
  if (profile.role !== 'SUPER_ADMIN') {
    redirect('/admin/dashboard');
  }

  const magazine = await getMagazineForReview(params.id);

  if (!magazine) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <ReviewWorkspace magazine={magazine} />
      </main>
    </div>
  );
}
