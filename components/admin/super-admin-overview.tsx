'use client';

import React from 'react';
import Link from 'next/link';
import { DepartmentStats } from '@/lib/magazines/admin';
import { MagazineWithRelations } from '@/types/magazine';
import { DepartmentWithStats } from '@/types/department';
import { PublicationStatusBadge } from '@/components/admin/publication-status-badge';
import { ProcessingStatusBadge } from '@/components/admin/processing-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import {
  Shield,
  BookOpen,
  Clock,
  CheckCircle2,
  Building2,
  Users,
  PlusCircle,
  ArrowRight,
  Eye,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';

interface SuperAdminOverviewProps {
  stats: DepartmentStats;
  departments: DepartmentWithStats[];
  userStats: {
    total: number;
    superAdmins: number;
    departmentAdmins: number;
    active: number;
  };
  recentSubmissions: MagazineWithRelations[];
}

export function SuperAdminOverview({
  stats,
  departments,
  userStats,
  recentSubmissions,
}: SuperAdminOverviewProps) {
  const pendingReviews = stats.submitted + stats.underReview;

  return (
    <div className="space-y-10">
      {/* Top Banner */}
      <div className="border border-[#E8E2D8] bg-white rounded-sm p-8 sm:p-10 shadow-editorial">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase tracking-widest font-mono font-semibold text-[#B58A55]">
                College Executive Desk
              </span>
              <span className="text-[#E8E2D8]">•</span>
              <Badge variant="gold" className="text-[9px]">
                College Super Admin
              </Badge>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#171717]">
              Institutional Governance & Review Desk
            </h1>

            <p className="text-xs sm:text-sm text-[#77736C] max-w-2xl font-light leading-relaxed">
              Complete administrative authority over academic departments, editorial staff provisioning, peer-review queues, and institutional publishing.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin/review">
              <Button
                variant="primary"
                size="md"
                className="gap-2 bg-[#171717] hover:bg-[#2C2C2A] text-white shadow-xs"
              >
                <Shield className="w-4 h-4 text-[#B58A55]" />
                <span>Review Queue ({pendingReviews})</span>
              </Button>
            </Link>

            <Link href="/admin/departments">
              <Button
                variant="outline"
                size="md"
                className="gap-2 border-[#E8E2D8] hover:bg-[#F8F6F1] text-[#171717]"
              >
                <Building2 className="w-4 h-4 text-[#77736C]" />
                <span>Departments</span>
              </Button>
            </Link>

            <Link href="/admin/users">
              <Button
                variant="outline"
                size="md"
                className="gap-2 border-[#E8E2D8] hover:bg-[#F8F6F1] text-[#171717]"
              >
                <Users className="w-4 h-4 text-[#77736C]" />
                <span>Manage Users</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Governance & Publication Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Pending Reviews */}
        <div className="border border-[#E8E2D8] bg-white rounded-sm p-5 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#77736C]">
              Pending Reviews
            </span>
            <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-amber-50 text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-serif text-3xl font-medium text-[#171717]">
              {pendingReviews}
            </span>
            <p className="text-[11px] text-[#77736C] font-light mt-0.5">
              Submissions awaiting approval
            </p>
          </div>
          {pendingReviews > 0 && (
            <Link
              href="/admin/review"
              className="text-[11px] font-mono text-[#B58A55] hover:text-[#171717] flex items-center gap-1 font-semibold pt-1"
            >
              <span>Open Review Queue</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Published Magazines */}
        <div className="border border-[#E8E2D8] bg-white rounded-sm p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#77736C]">
              Published Archive
            </span>
            <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-serif text-3xl font-medium text-[#171717]">
              {stats.published}
            </span>
            <p className="text-[11px] text-[#77736C] font-light mt-0.5">
              Live in public digital archive
            </p>
          </div>
          <Link
            href="/magazines"
            target="_blank"
            className="text-[11px] font-mono text-[#77736C] hover:text-[#171717] flex items-center gap-1 pt-1"
          >
            <span>View Public Library</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Academic Departments */}
        <div className="border border-[#E8E2D8] bg-white rounded-sm p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#77736C]">
              Academic Depts
            </span>
            <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-blue-50 text-blue-800">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-serif text-3xl font-medium text-[#171717]">
              {departments.length}
            </span>
            <p className="text-[11px] text-[#77736C] font-light mt-0.5">
              Active publishing departments
            </p>
          </div>
          <Link
            href="/admin/departments"
            className="text-[11px] font-mono text-[#77736C] hover:text-[#171717] flex items-center gap-1 pt-1"
          >
            <span>Manage Registry</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Editorial Users */}
        <div className="border border-[#E8E2D8] bg-white rounded-sm p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#77736C]">
              Editorial Staff
            </span>
            <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-purple-50 text-purple-800">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-serif text-3xl font-medium text-[#171717]">
              {userStats.total}
            </span>
            <p className="text-[11px] text-[#77736C] font-light mt-0.5">
              {userStats.departmentAdmins} Dept Admins • {userStats.superAdmins} Super Admins
            </p>
          </div>
          <Link
            href="/admin/users"
            className="text-[11px] font-mono text-[#77736C] hover:text-[#171717] flex items-center gap-1 pt-1"
          >
            <span>Manage Staff</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Two-Column Section: Submissions Queue & Departments Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Recent Submissions / Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border-b border-[#E8E2D8] pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B58A55] block">
                Editorial Review Pipeline
              </span>
              <h2 className="font-serif text-xl font-medium text-[#171717]">
                Recent Submissions
              </h2>
            </div>

            <Link
              href="/admin/review"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#171717] hover:text-[#B58A55] transition-colors"
            >
              <span>Full Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white border border-[#E8E2D8] rounded-sm overflow-hidden shadow-xs">
            {recentSubmissions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#77736C]">
                No pending publications currently waiting for review.
              </div>
            ) : (
              <div className="divide-y divide-[#E8E2D8]">
                {recentSubmissions.slice(0, 6).map((mag) => (
                  <div
                    key={mag.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-[#FDFBF7] transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-semibold text-xs text-[#171717] truncate">
                          {mag.title}
                        </span>
                        <PublicationStatusBadge status={mag.status} />
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[#77736C]">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>{mag.department?.name || 'Department'}</span>
                        </span>
                        <span>•</span>
                        <span className="font-mono">{mag.academic_year}</span>
                        <span>•</span>
                        <span className="font-mono">{mag.page_count} pages</span>
                      </div>
                    </div>

                    <Link
                      href={`/admin/review/${mag.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#171717] text-[#F8F6F1] hover:bg-[#33312E] rounded-sm text-xs font-medium shrink-0 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Academic Departments Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border-b border-[#E8E2D8] pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B58A55] block">
                Academic Units
              </span>
              <h2 className="font-serif text-xl font-medium text-[#171717]">
                Departments Directory
              </h2>
            </div>

            <Link
              href="/admin/departments"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#171717] hover:text-[#B58A55] transition-colors"
            >
              <span>Manage Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white border border-[#E8E2D8] rounded-sm overflow-hidden shadow-xs divide-y divide-[#E8E2D8]">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FDFBF7] transition-colors"
              >
                <div>
                  <span className="font-semibold text-xs text-[#171717] block">
                    {dept.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#77736C]">
                    {dept.short_name} • Slug: {dept.slug}
                  </span>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#F8F6F1] border border-[#E8E2D8] text-[#171717]">
                    {dept.magazine_count || 0} issues
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
