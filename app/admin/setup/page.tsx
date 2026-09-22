import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'First-Time Setup | College Super Administrator',
  description: 'Initial institutional provisioning of the College Super Administrator account.',
};

export default async function AdminSetupPage() {
  redirect('/admin/login');
}
