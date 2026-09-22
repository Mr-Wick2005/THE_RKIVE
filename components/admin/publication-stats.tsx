import React from 'react';
import { DepartmentStats } from '@/lib/magazines/admin';
import { BookOpen, FileEdit, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PublicationStatsProps {
  stats: DepartmentStats;
  departmentName?: string;
}

export function PublicationStats({ stats, departmentName }: PublicationStatsProps) {
  const cards = [
    {
      label: 'Total Publications',
      value: stats.total,
      description: 'Department issues registered',
      icon: BookOpen,
      color: 'text-[#171717]',
      bg: 'bg-[#F8F6F1]',
    },
    {
      label: 'Draft Editions',
      value: stats.drafts,
      description: 'In development, editable',
      icon: FileEdit,
      color: 'text-amber-800',
      bg: 'bg-amber-50/70',
    },
    {
      label: 'Under Review',
      value: stats.submitted + stats.underReview,
      description: 'Submitted for college approval',
      icon: Clock,
      color: 'text-blue-800',
      bg: 'bg-blue-50/70',
    },
    {
      label: 'Published',
      value: stats.published,
      description: 'Active in public archive',
      icon: CheckCircle2,
      color: 'text-emerald-800',
      bg: 'bg-emerald-50/70',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="border border-[#E8E2D8] bg-white rounded-sm p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#77736C]">
                {card.label}
              </span>
              <div className={`w-7 h-7 rounded-sm flex items-center justify-center ${card.bg}`}>
                <Icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
            </div>

            <div>
              <span className="font-serif text-3xl font-medium text-[#171717]">
                {card.value}
              </span>
              <p className="text-[11px] text-[#77736C] font-light mt-0.5">
                {card.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
