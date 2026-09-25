import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t-2 border-[#1A1A1A] bg-[#DDD4C5]/40 text-[#1A1A1A] mt-auto">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-14">
        {/* Main Footer Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Masthead Info & Logo */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <div className="relative h-12 w-44">
                <Image
                  src="/images/the-rkive-logo.png"
                  alt="THE RKIVE Logo"
                  fill
                  sizes="176px"
                  className="object-contain object-left"
                />
              </div>
            </Link>

            <p className="text-base sm:text-lg text-[#3E3C38] max-w-md leading-relaxed font-normal">
              The official digital repository preserving annual research journals, capstone periodicals, and departmental magazines across all collegiate academic faculties.
            </p>

            <div className="pt-2">
              <span className="inline-block text-xs sm:text-sm font-mono font-bold uppercase tracking-widest text-[#1A1A1A] border-2 border-[#1A1A1A] bg-[#F4EFEB] px-3.5 py-2 shadow-[2px_2px_0px_#1A1A1A]">
                Public Digital Library Architecture
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h5 className="text-sm sm:text-base font-mono font-bold uppercase tracking-widest text-[#1A1A1A]">
              Navigation
            </h5>
            <ul className="space-y-3 text-base font-medium text-[#3E3C38]">
              <li>
                <Link href="/" className="hover:text-[#1B44B8] hover:underline transition-colors">
                  Library Front Page
                </Link>
              </li>
              <li>
                <Link href="/magazines" className="hover:text-[#1B44B8] hover:underline transition-colors">
                  Complete Magazine Archive
                </Link>
              </li>
              <li>
                <Link href="/#departments" className="hover:text-[#1B44B8] hover:underline transition-colors">
                  Academic Faculties
                </Link>
              </li>
              <li>
                <Link href="/#about-us" className="hover:text-[#1B44B8] hover:underline transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Faculties */}
          <div className="space-y-4">
            <h5 className="text-sm sm:text-base font-mono font-bold uppercase tracking-widest text-[#1A1A1A]">
              Faculties
            </h5>
            <ul className="space-y-3 text-base font-medium text-[#3E3C38]">
              <li>
                <Link href="/department/computer-engineering" className="hover:text-[#1B44B8] hover:underline transition-colors">
                  Computer Engineering
                </Link>
              </li>
              <li>
                <Link href="/department/artificial-intelligence-machine-learning" className="hover:text-[#1B44B8] hover:underline transition-colors">
                  AI & Machine Learning
                </Link>
              </li>
              <li>
                <Link href="/department/information-technology" className="hover:text-[#1B44B8] hover:underline transition-colors">
                  Information Technology
                </Link>
              </li>
              <li>
                <Link href="/department/electronics-telecommunication" className="hover:text-[#1B44B8] hover:underline transition-colors">
                  Electronics & Telecom
                </Link>
              </li>
            </ul>
          </div>

          {/* Administration & Security */}
          <div className="space-y-4">
            <h5 className="text-sm sm:text-base font-mono font-bold uppercase tracking-widest text-[#1A1A1A]">
              Editorial Desk
            </h5>
            <ul className="space-y-3.5 text-base text-[#3E3C38]">
              <li>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-[#1A1A1A] font-semibold hover:bg-[#1A1A1A] hover:text-[#FAF7F2] transition-colors shadow-[2px_2px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1B44B8] text-sm uppercase tracking-wider"
                >
                  <Shield className="w-4 h-4 text-[#C24A26]" />
                  <span>Administrative Login</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/dashboard"
                  className="hover:text-[#1B44B8] hover:underline transition-colors font-medium text-base block"
                >
                  Department Workspace
                </Link>
              </li>
              <li>
                <span className="text-xs sm:text-sm font-mono text-[#706B62] font-medium block">
                  Row Level Security (RLS) Active
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Single Integrated Footer Bottom Bar */}
        <div className="mt-14 pt-8 border-t-2 border-[#1A1A1A]/20 flex flex-col md:flex-row items-center justify-between gap-4 text-sm sm:text-base text-[#3E3C38]">
          <p>© {new Date().getFullYear()} THE RKIVE — Digital Magazine Archive. All rights reserved.</p>

          {/* Developer Credits */}
          <div className="text-center font-mono text-sm sm:text-base text-[#3E3C38]">
            <span>Developed by </span>
            <span className="font-bold text-[#1A1A1A]">Vedanth Gali</span>
            <span className="font-bold text-[#1A1A1A]">, </span>
            <span className="font-bold text-[#1A1A1A]">Saathvik Shetty
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
