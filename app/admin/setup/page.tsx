import { redirect } from 'next/navigation';
import { isSuperAdminBootstrapAvailable } from '@/lib/auth/bootstrap';
import { SuperAdminSetupForm } from '@/components/admin/super-admin-setup-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'First-Time Setup | College Super Administrator',
  description: 'Initial institutional provisioning of the College Super Administrator account.',
};

export default async function AdminSetupPage() {
  const isAvailable = await isSuperAdminBootstrapAvailable();
  if (!isAvailable) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <SuperAdminSetupForm />
      </div>
    </div>
  );
}
