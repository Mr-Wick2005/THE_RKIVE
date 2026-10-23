'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  LogOut,
  ArrowLeft,
  Building2,
  PlusCircle,
  BookOpen,
  LayoutDashboard,
  Users,
  Sparkles,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
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

  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const manageDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        manageDropdownRef.current &&
        !manageDropdownRef.current.contains(event.target as Node)
      ) {
        setIsManageOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown and mobile menu on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsManageOpen(false);
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close on route change
  useEffect(() => {
    setIsManageOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isManageActive =
    pathname.startsWith('/admin/studio') ||
    pathname.startsWith('/admin/landing-page') ||
    pathname.startsWith('/admin/departments') ||
    pathname.startsWith('/admin/users');

  const manageSubLinks = [
    {
      href: '/admin/studio',
      label: 'Landing Page Studio',
      description: 'Curate showcase, themes & hero',
      icon: Sparkles,
      iconBg: 'bg-amber-50 text-amber-800 border-amber-200/60',
      active: pathname.startsWith('/admin/studio') || pathname.startsWith('/admin/landing-page'),
    },
    {
      href: '/admin/departments',
      label: 'Academic Departments',
      description: 'Manage academic units & quotas',
      icon: Building2,
      iconBg: 'bg-blue-50 text-blue-800 border-blue-200/60',
      active: pathname.startsWith('/admin/departments'),
    },
    {
      href: '/admin/users',
      label: 'Editorial Staff & Roles',
      description: 'Provision coordinators & reviewers',
      icon: Users,
      iconBg: 'bg-stone-100 text-stone-800 border-stone-200',
      active: pathname.startsWith('/admin/users'),
    },
  ];

  return (
    <header className="border-b border-[#E8E2D8] bg-white sticky top-0 z-40">
      {/* Top Academic Sub-bar */}
      <div className="border-b border-[#F0EBE1] px-4 sm:px-6 py-1.5 flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#55524D]">
        <div className="flex items-center gap-2 truncate">
          <span>Editorial Management Portal</span>
          <span>•</span>
          <span className="text-[#171717] font-semibold truncate">
            {isSuper ? 'College Super Admin' : department?.name || 'Department Admin'}
          </span>
        </div>
        <Link
          href="/"
          className="hover:text-[#171717] flex items-center gap-1.5 transition-colors font-medium text-xs shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Public Archive</span>
        </Link>
      </div>

      {/* Main Masthead Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Branding & Role Context */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center font-serif text-lg font-semibold shadow-xs shrink-0">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg sm:text-xl font-semibold text-[#171717] leading-none whitespace-nowrap">
                  Editorial Desk
                </span>
                <Badge
                  variant={isSuper ? 'gold' : 'department'}
                  className="text-xs py-0.5 px-2 shrink-0"
                >
                  {isSuper ? 'Super Admin' : 'Department Admin'}
                </Badge>
              </div>
              {department && !isSuper && (
                <div className="flex items-center gap-1.5 text-xs text-[#55524D] mt-1 font-mono">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[180px]">{department.name}</span>
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links (Clean, No Scroller, With Dropdown) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 text-sm font-medium text-[#33312E]">
          {isSuper && (
            <>
              {/* Executive Desk */}
              <Link
                href="/admin/dashboard"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-sm transition-all text-sm min-h-[38px] whitespace-nowrap font-medium',
                  pathname === '/admin/dashboard'
                    ? 'bg-[#171717] text-[#F8F6F1] font-semibold shadow-xs'
                    : 'hover:bg-[#F8F6F1] text-[#33312E] hover:text-[#171717]'
                )}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Executive Desk</span>
              </Link>

              {/* Review Queue */}
              <Link
                href="/admin/review"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-sm transition-all text-sm min-h-[38px] whitespace-nowrap font-medium',
                  pathname.startsWith('/admin/review')
                    ? 'bg-[#171717] text-[#F8F6F1] font-semibold shadow-xs'
                    : 'hover:bg-[#F8F6F1] text-[#33312E] hover:text-[#171717]'
                )}
              >
                <Shield className="w-4 h-4 shrink-0 text-[#B58A55]" />
                <span>Review Queue</span>
              </Link>
            </>
          )}

          {/* Publications */}
          <Link
            href="/admin/magazines"
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-sm transition-all text-sm min-h-[38px] whitespace-nowrap font-medium',
              pathname === '/admin/magazines' || (pathname.startsWith('/admin/magazines/') && !pathname.includes('/new'))
                ? 'bg-[#171717] text-[#F8F6F1] font-semibold shadow-xs'
                : 'hover:bg-[#F8F6F1] text-[#33312E] hover:text-[#171717]'
            )}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>{isSuper ? 'Publications' : 'My Publications'}</span>
          </Link>

          {/* Super Admin Management Dropdown */}
          {isSuper && (
            <div ref={manageDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsManageOpen((prev) => !prev)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-sm transition-all text-sm min-h-[38px] whitespace-nowrap font-medium cursor-pointer',
                  isManageActive
                    ? 'bg-[#171717] text-[#F8F6F1] font-semibold shadow-xs'
                    : isManageOpen
                    ? 'bg-[#F0EBE1] text-[#171717]'
                    : 'hover:bg-[#F8F6F1] text-[#33312E] hover:text-[#171717]'
                )}
                aria-expanded={isManageOpen}
                aria-haspopup="true"
              >
                <span>Manage</span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    isManageOpen && 'rotate-180',
                    isManageActive ? 'text-[#B58A55]' : 'text-[#77736C]'
                  )}
                />
              </button>

              {isManageOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#E8E2D8] rounded-sm shadow-editorial-lg py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#77736C] font-semibold border-b border-[#F0EBE1] mb-1">
                    Institutional Governance
                  </div>

                  {manageSubLinks.map((sub) => {
                    const Icon = sub.icon;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setIsManageOpen(false)}
                        className={cn(
                          'flex items-start gap-3 px-3 py-2 hover:bg-[#F8F6F1] transition-colors rounded-sm mx-1',
                          sub.active && 'bg-[#F6F1EA] font-medium'
                        )}
                      >
                        <div
                          className={cn(
                            'w-7 h-7 rounded-sm flex items-center justify-center shrink-0 mt-0.5 border',
                            sub.iconBg
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#171717] truncate">
                            {sub.label}
                          </div>
                          <p className="text-xs text-[#77736C] mt-0.5 leading-tight truncate">
                            {sub.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Create Publication */}
          <Link
            href="/admin/magazines/new"
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-sm transition-all text-sm min-h-[38px] whitespace-nowrap font-medium',
              pathname === '/admin/magazines/new'
                ? 'bg-[#171717] text-[#F8F6F1] font-semibold shadow-xs'
                : 'hover:bg-[#F8F6F1] text-[#33312E] hover:text-[#171717]'
            )}
          >
            <PlusCircle className="w-4 h-4 shrink-0 text-[#B58A55]" />
            <span>Create Publication</span>
          </Link>
        </nav>

        {/* Right: User Identity & Sign Out + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden xl:block">
            <span className="block text-sm font-medium text-[#171717] truncate max-w-[200px]">
              {profile.full_name}
            </span>
            <span className="block text-xs font-mono text-[#55524D] truncate max-w-[200px]">
              {profile.email}
            </span>
          </div>

          <button
            type="button"
            onClick={async () => {
              const { createClient } = await import('@/lib/supabase/client');
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = '/admin/login';
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#E8E2D8] text-sm font-medium text-[#33312E] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors shadow-xs cursor-pointer min-h-[38px]"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-sm border border-[#E8E2D8] text-[#171717] hover:bg-[#F8F6F1] transition-colors min-h-[38px] min-w-[38px]"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8E2D8] bg-[#FAF8F5] px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {isSuper && (
              <>
                <Link
                  href="/admin/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                    pathname === '/admin/dashboard'
                      ? 'bg-[#171717] text-[#F8F6F1]'
                      : 'hover:bg-white text-[#171717]'
                  )}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Executive Desk</span>
                </Link>

                <Link
                  href="/admin/review"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                    pathname.startsWith('/admin/review')
                      ? 'bg-[#171717] text-[#F8F6F1]'
                      : 'hover:bg-white text-[#171717]'
                  )}
                >
                  <Shield className="w-4 h-4 shrink-0 text-[#B58A55]" />
                  <span>Review Queue</span>
                </Link>
              </>
            )}

            <Link
              href="/admin/magazines"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                pathname === '/admin/magazines' || (pathname.startsWith('/admin/magazines/') && !pathname.includes('/new'))
                  ? 'bg-[#171717] text-[#F8F6F1]'
                  : 'hover:bg-white text-[#171717]'
              )}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>{isSuper ? 'Publications' : 'My Publications'}</span>
            </Link>

            <Link
              href="/admin/magazines/new"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                pathname === '/admin/magazines/new'
                  ? 'bg-[#171717] text-[#F8F6F1]'
                  : 'hover:bg-white text-[#171717]'
              )}
            >
              <PlusCircle className="w-4 h-4 shrink-0 text-[#B58A55]" />
              <span>Create Publication</span>
            </Link>

            {isSuper && (
              <div className="pt-2 border-t border-[#E8E2D8] mt-2 space-y-1">
                <div className="px-3 text-[10px] font-mono uppercase tracking-wider text-[#77736C] font-semibold mb-1">
                  Management Sections
                </div>
                {manageSubLinks.map((sub) => {
                  const Icon = sub.icon;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                        sub.active ? 'bg-[#171717] text-[#F8F6F1]' : 'hover:bg-white text-[#171717]'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{sub.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* User info and Sign Out for mobile */}
          <div className="pt-3 border-t border-[#E8E2D8] flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="block text-sm font-medium text-[#171717] truncate">
                {profile.full_name}
              </span>
              <span className="block text-xs font-mono text-[#55524D] truncate">
                {profile.email}
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = '/admin/login';
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[#E8E2D8] text-xs font-medium text-[#33312E] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
