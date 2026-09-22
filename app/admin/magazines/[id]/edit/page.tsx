import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/permissions';
import { getDepartmentById } from '@/lib/departments';
import { getMyDepartmentMagazineById } from '@/lib/magazines/admin';
import { AdminHeader } from '@/components/layout/admin-header';
import { PublicationForm } from '@/components/admin/publication-form';
import { PublicationStatusBadge } from '@/components/admin/publication-status-badge';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EditPublicationPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: EditPublicationPageProps) {
  return {
    title: 'Edit Publication | Editorial Desk',
  };
}

export default async function EditPublicationPage({ params }: EditPublicationPageProps) {
  const { profile } = await requireAuth();

  const magazine = await getMyDepartmentMagazineById(params.id, profile);

  if (!magazine) {
    notFound();
  }

  let department = null;
  if (magazine.department_id) {
    department = await getDepartmentById(magazine.department_id);
  }

  const isSuper = profile.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} department={department} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-10 space-y-8">
        {/* Breadcrumb & Header */}
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
            <span className="text-[#171717] font-semibold">Edit Publication</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-3xl font-medium tracking-tight text-[#171717]">
                  Edit Publication
                </h1>
                <PublicationStatusBadge status={magazine.status} />
              </div>
              <p className="text-xs sm:text-sm text-[#77736C] font-light leading-relaxed mt-1">
                Update editorial metadata, replace cover artwork or PDF document, and save draft revisions.
              </p>
            </div>
          </div>
        </div>

        {/* Publication Form */}
        <PublicationForm
          initialData={magazine}
          department={department}
          isSuperAdmin={isSuper}
        />
      </main>
    </div>
  );
}
