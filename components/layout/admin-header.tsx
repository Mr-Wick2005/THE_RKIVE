'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LogOut, ArrowLeft, Building2, PlusCircle, BookOpen, LayoutDashboard } from 'lucide-react';
import { Profile } from '@/types/auth';
import { Badge } from '@/components/ui/badge';
import { Department } from '@/types/department';
import { cn } from '@/lib/utils';

interface AdminHeaderProps {
  profile: Profile;
  department?: Department | null;
}

export function AdminHeader({ profile, department }: AdminHeaderProps) {
  const pathname = usePathname();

  const isSuper = profile.role === 'SUPER_ADMIN';

  const navLinks = [
    ...(isSuper
      ? [
          {
            href: '/admin/dashboard',
            label: 'Executive Desk',
            icon: LayoutDashboard,
            active: pathname === '/admin/dashboard',
          },
          {
            href: '/admin/review',
            label: 'Review Queue',
            icon: Shield,
            active: pathname.startsWith('/admin/review'),
          },
          {
            href: '/admin/users',
            label: 'Editorial Staff',
            icon: Building2,
            active: pathname.startsWith('/admin/users'),
          },
        ]
      : []),
    {
      href: '/admin/magazines',
      label: isSuper ? 'All Publications' : 'My Publications',
      icon: BookOpen,
      active: pathname === '/admin/magazines' || (pathname.startsWith('/admin/magazines/') && !pathname.includes('/new')),
    },
    {
      href: '/admin/magazines/new',
      label: 'Create Publication',
      icon: PlusCircle,
      active: pathname === '/admin/magazines/new',
    },
  ];

  return (
    <header className="border-b border-[#E8E2D8] bg-white sticky top-0 z-40">
      {/* Top Academic Sub-bar */}
      <div className="border-b border-[#F0EBE1] px-6 py-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#77736C]">
        <div className="flex items-center gap-2">
          <span>Editorial Management Portal</span>
          <span>•</span>
          <span className="text-[#171717] font-semibold">
            {isSuper ? 'College Super Admin' : department?.name || 'Department Admin'}
          </span>
        </div>
        <Link
          href="/"
          className="hover:text-[#171717] flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Exit to Public Archive</span>
        </Link>
      </div>

      {/* Main Masthead Bar */}
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Branding & Role Context */}
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center font-serif text-base font-semibold shadow-sm">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-semibold text-[#171717] leading-none">
                  Editorial Desk
                </span>
                <Badge
                  variant={isSuper ? 'gold' : 'department'}
                  className="text-[9px] py-0 px-1.5"
                >
                  {isSuper ? 'Super Admin' : 'Department Admin'}
                </Badge>
              </div>
              {department && !isSuper && (
                <div className="flex items-center gap-1 text-[11px] text-[#77736C] mt-0.5 font-mono">
                  <Building2 className="w-3 h-3" />
                  <span>{department.name}</span>
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs font-medium text-[#44423E]">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all text-xs',
                  item.active
                    ? 'bg-[#171717] text-[#F8F6F1] font-semibold shadow-sm'
                    : 'hover:bg-[#F8F6F1] text-[#44423E] hover:text-[#171717]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: User Identity & Sign out */}
        <div className="flex items-center gap-4 self-end md:self-center">
          <div className="text-right hidden lg:block">
            <span className="block text-xs font-medium text-[#171717]">
              {profile.full_name}
            </span>
            <span className="block text-[10px] font-mono text-[#77736C]">
              {profile.email}
            </span>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[#E8E2D8] text-xs font-medium text-[#44423E] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
