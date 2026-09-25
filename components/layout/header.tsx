'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Shield, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/magazines', label: 'Magazine Archive' },
    { href: '/#departments', label: 'Departments' },
    { href: '/#about-us', label: 'About Us' },
  ];

  return (
    <header className="border-b-2 border-[#1A1A1A] bg-[#EAE3D7]/95 backdrop-blur-md sticky top-0 z-50 transition-all shadow-sm">
      {/* Main Masthead Navigation */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-3.5 sm:py-4 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center group py-1">
          <div className="relative h-12 sm:h-16 md:h-20 w-36 sm:w-48 md:w-60 transition-transform duration-200 group-hover:scale-[1.02]">
            <Image
              src="/images/the-rkive-logo.png"
              alt="THE RKIVE Logo"
              fill
              priority
              sizes="(max-width: 640px) 144px, (max-width: 768px) 192px, 240px"
              className="object-contain object-left"
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-9 text-base font-semibold tracking-wider uppercase text-[#1A1A1A]">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== '/' && pathname.startsWith(link.href) && !link.href.includes('#'));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'hover:text-[#1B44B8] transition-colors py-1.5 relative group',
                  isActive && 'text-[#1B44B8] font-bold'
                )}
              >
                {link.label}
                <span
                  className={cn(
                    'absolute bottom-0 left-0 h-[2px] bg-[#1B44B8] transition-all duration-200',
                    isActive ? 'w-full' : 'w-0 group-hover:w-full'
                  )}
                />
              </Link>
            );
          })}

          <div className="h-5 w-px bg-[#1A1A1A]/20" />

          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none border-2 border-[#1A1A1A] bg-[#F4EFEB] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FAF7F2] hover:border-[#1A1A1A] transition-all shadow-[2px_2px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1B44B8] group font-semibold text-sm uppercase tracking-wider"
          >
            <Shield className="w-4 h-4 text-[#C24A26] group-hover:text-[#FAF7F2] transition-colors" />
            <span>Editorial Desk</span>
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
          className="md:hidden p-2 rounded-sm text-[#121210] border border-[#2C2824]/20 hover:bg-black/5"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2C2824]/15 bg-[#FAF8F3] px-6 py-5 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3.5 text-base font-semibold">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-[#2E2B26] hover:text-[#121210] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[#2C2824]/15">
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xs bg-[#121210] text-[#FAF7F2] text-sm font-semibold uppercase tracking-wider shadow-sm"
              >
                <Shield className="w-4 h-4 text-[#C4934E]" />
                <span>Editorial Desk Login</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export const Navbar = Header;
