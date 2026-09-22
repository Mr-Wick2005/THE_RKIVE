'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Shield, Menu, X, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/magazines', label: 'Magazine Archive' },
    { href: '/#departments', label: 'Departments' },
    { href: '/#about', label: 'Archive Mission' },
  ];

  return (
    <header className="border-b border-[#E8E2D8] bg-[#F8F6F1]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      {/* Top Academic Sub-bar */}
      <div className="border-b border-[#E8E2D8]/60 px-6 py-1 text-center text-[10px] uppercase tracking-widest font-mono text-[#77736C]">
        <span>Official College-Wide Digital Publishing Platform & Academic Archive</span>
      </div>

      {/* Main Masthead Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Brand / Crest */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="w-9 h-9 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center font-serif text-xl font-semibold shadow-sm transition-transform duration-300 group-hover:scale-105">
            A
          </div>
          <div>
            <span className="font-serif text-xl sm:text-2xl tracking-tight font-semibold text-[#171717] block leading-none">
              ATHENAEUM
            </span>
            <span className="text-[9px] tracking-widest uppercase font-mono text-[#77736C] block mt-1">
              Digital Publication Archive
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-wider font-medium text-[#44423E]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'hover:text-[#171717] transition-colors py-1 relative',
                  isActive && 'text-[#171717] font-semibold'
                )}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#171717]" />
                )}
              </Link>
            );
          })}

          <div className="h-4 w-px bg-[#E8E2D8]" />

          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm border border-[#E8E2D8] bg-white text-[#171717] hover:bg-[#171717] hover:text-[#F8F6F1] hover:border-[#171717] transition-all shadow-sm group"
          >
            <Shield className="w-3.5 h-3.5 text-[#B58A55] group-hover:text-[#F8F6F1] transition-colors" />
            <span>Editorial Desk</span>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
          className="md:hidden p-2 rounded-sm text-[#171717] hover:bg-[#E8E2D8]/50"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8E2D8] bg-[#F8F6F1] px-6 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-[#44423E] hover:text-[#171717] font-medium"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[#E8E2D8]">
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-sm bg-[#171717] text-[#F8F6F1] text-xs font-semibold uppercase tracking-wider"
              >
                <Shield className="w-3.5 h-3.5 text-[#B58A55]" />
                <span>Editorial Desk Login</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
