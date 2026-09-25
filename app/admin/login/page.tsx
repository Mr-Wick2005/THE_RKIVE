import React, { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/admin/login-form';
import { ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-between p-6">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold uppercase tracking-wider text-[#2E2B26] hover:text-[#121210] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Public Archive</span>
        </Link>
        <span className="text-xs sm:text-sm font-mono font-bold text-[#55524D] uppercase tracking-wider">
          EDITORIAL GATEWAY • SECURE AUTH
        </span>
      </div>

      {/* Login Card */}
      <div className="max-w-md w-full mx-auto my-12">
        <Suspense
          fallback={
            <div className="p-8 border border-[#2C2824]/20 bg-[#FFFFFF] rounded-sm text-center text-sm text-[#55524D]">
              Loading login portal...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="text-center text-xs sm:text-sm font-mono text-[#55524D]">
        College Digital Magazine Platform • Editorial Authentication
      </div>
    </div>
  );
}
