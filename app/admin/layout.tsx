'use client';

import React from 'react';
import { AdminAuthProvider } from '@/components/admin/admin-auth-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
