import Link from 'next/link';
import { BookOpen, Shield, ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#E8E2D8] bg-[#F0EBE1] text-[#44423E] mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Masthead Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center font-serif text-lg font-semibold">
                A
              </div>
              <span className="font-serif text-xl font-semibold text-[#171717] tracking-tight">
                ATHENAEUM ARCHIVE
              </span>
            </div>

            <p className="text-xs text-[#77736C] max-w-sm leading-relaxed font-light">
              The official digital repository preserving annual research journals, capstone periodicals, and departmental magazines across all college academic faculties.
            </p>

            <div className="pt-2">
              <span className="inline-block text-[10px] font-mono uppercase tracking-widest text-[#77736C] border border-[#DCD5C9] bg-white px-2 py-1 rounded-sm">
                Module 02 — Public Digital Library Architecture
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h5 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#171717]">
              Navigation
            </h5>
            <ul className="space-y-2 text-xs text-[#77736C]">
              <li>
                <Link href="/" className="hover:text-[#171717] transition-colors">
                  Library Front Page
                </Link>
              </li>
              <li>
                <Link href="/magazines" className="hover:text-[#171717] transition-colors">
                  Complete Magazine Archive
                </Link>
              </li>
              <li>
                <Link href="/#departments" className="hover:text-[#171717] transition-colors">
                  Academic Faculties
                </Link>
              </li>
              <li>
                <Link href="/#bookshelf" className="hover:text-[#171717] transition-colors">
                  The Digital Bookshelf
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Faculties */}
          <div className="space-y-3">
            <h5 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#171717]">
              Faculties
            </h5>
            <ul className="space-y-2 text-xs text-[#77736C]">
              <li>
                <Link href="/department/computer-engineering" className="hover:text-[#171717] transition-colors">
                  Computer Engineering
                </Link>
              </li>
              <li>
                <Link href="/department/artificial-intelligence-machine-learning" className="hover:text-[#171717] transition-colors">
                  AI & Machine Learning
                </Link>
              </li>
              <li>
                <Link href="/department/information-technology" className="hover:text-[#171717] transition-colors">
                  Information Technology
                </Link>
              </li>
              <li>
                <Link href="/department/electronics-telecommunication" className="hover:text-[#171717] transition-colors">
                  Electronics & Telecom
                </Link>
              </li>
            </ul>
          </div>

          {/* Administration & Security */}
          <div className="space-y-3">
            <h5 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#171717]">
              Editorial Desk
            </h5>
            <ul className="space-y-2 text-xs text-[#77736C]">
              <li>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1 text-[#171717] font-medium hover:text-[#B58A55] transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-[#B58A55]" />
                  <span>Administrative Login</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/dashboard"
                  className="hover:text-[#171717] transition-colors"
                >
                  Department Workspace
                </Link>
              </li>
              <li>
                <span className="text-[11px] font-mono text-[#9A958E]">
                  Row Level Security (RLS) Active
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="editorial-rule my-10" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#77736C]">
          <p>© {new Date().getFullYear()} College Digital Magazine Archive. All rights reserved.</p>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>Light Editorial Theme</span>
            <span>•</span>
            <span>Zero Dark-UI</span>
            <span>•</span>
            <span>PostgreSQL RLS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
