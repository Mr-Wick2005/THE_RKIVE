import React from 'react';
import { MagazineStatus } from '@/types/magazine';
import { cn } from '@/lib/utils';
import { Clock, FileEdit, CheckCircle, ShieldCheck, AlertCircle, Archive } from 'lucide-react';

interface PublicationStatusBadgeProps {
  status: MagazineStatus;
  className?: string;
  showIcon?: boolean;
}

export function PublicationStatusBadge({
  status,
  className,
  showIcon = true,
}: PublicationStatusBadgeProps) {
  const configs: Record<
    MagazineStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    DRAFT: {
      label: 'Draft',
      bg: 'bg-stone-100',
      text: 'text-stone-800',
      border: 'border-stone-300',
      icon: FileEdit,
    },
    SUBMITTED: {
      label: 'Submitted for Review',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      icon: Clock,
    },
    UNDER_REVIEW: {
      label: 'Under Editorial Review',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
      icon: Clock,
    },
    APPROVED: {
      label: 'Approved',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      icon: CheckCircle,
    },
    PUBLISHED: {
      label: 'Published',
      bg: 'bg-emerald-100',
      text: 'text-emerald-900',
      border: 'border-emerald-400',
      icon: ShieldCheck,
    },
    REJECTED: {
      label: 'Needs Changes',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      icon: AlertCircle,
    },
    ARCHIVED: {
      label: 'Archived',
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
      icon: Archive,
    },
  };

  const config = configs[status] || configs.DRAFT;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-0.5 text-[11px] font-medium border font-mono tracking-wide',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      <span>{config.label}</span>
    </span>
  );
}
