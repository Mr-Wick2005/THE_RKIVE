import Link from 'next/link';
import { requireAuth } from '@/lib/auth/permissions';
import { getActiveDepartments, getDepartmentById } from '@/lib/departments';
import { AdminHeader } from '@/components/layout/admin-header';
import { PublicationForm } from '@/components/admin/publication-form';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create Publication | Editorial Desk',
};

export default async function NewPublicationPage() {
  const { profile } = await requireAuth();

  let department = null;
  if (profile.department_id) {
    department = await getDepartmentById(profile.department_id);
  }

  const isSuper = profile.role === 'SUPER_ADMIN';
  const departments = isSuper ? await getActiveDepartments() : [];

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} department={department} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-10 space-y-8">
        {/* Breadcrumbs & Header */}
        <div className="border-b border-[#E8E2D8] pb-6 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#77736C]">
            <Link href="/admin/dashboard" className="hover:text-[#171717] transition-colors">
              Workspace
            </Link>
            <span>/</span>
            <Link href="/admin/magazines" className="hover:text-[#171717] transition-colors">
              Publications
            </Link>
            <span>/</span>
            <span className="text-[#171717] font-semibold">New Publication</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-medium tracking-tight text-[#171717]">
                Create New Digital Magazine
              </h1>
              <p className="text-xs sm:text-sm text-[#77736C] font-light leading-relaxed mt-1">
                Enter archival metadata, upload cover artwork and publication PDF, and save as a department draft or submit directly for college review.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Section Publication Form */}
        <PublicationForm
          department={department}
          isSuperAdmin={isSuper}
          departments={departments}
        />
      </main>
    </div>
  );
}
