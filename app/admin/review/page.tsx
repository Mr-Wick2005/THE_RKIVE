import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/session';
import { AdminHeader } from '@/components/layout/admin-header';
import { ReviewQueueTable } from '@/components/admin/review-queue-table';
import { getReviewQueueMagazines } from '@/lib/magazines/admin';
import { Shield, BookOpen } from 'lucide-react';

export const metadata = {
  title: 'College Editorial Review Queue | College Digital Magazine',
  description: 'Super Administrator publication approval workspace and review queue.',
};

export default async function AdminReviewPage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    redirect('/admin/login');
  }

  // Strictly enforce Super Admin access for college-wide review queue
  if (profile.role !== 'SUPER_ADMIN') {
    redirect('/admin/dashboard');
  }

  const magazines = await getReviewQueueMagazines('ALL');

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#B58A55] mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Institutional Governance</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#171717]">
            College Publication Review Desk
          </h1>
          <p className="text-xs sm:text-sm text-[#77736C] mt-1 max-w-2xl">
            Evaluate, approve, or request revisions on departmental digital magazine submissions before publishing to the institutional digital archive.
          </p>
        </div>

        {/* Review Queue Component */}
        <ReviewQueueTable initialMagazines={magazines} />
      </main>
    </div>
  );
}
