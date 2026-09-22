import * as React from 'react';
import { cn } from '@/lib/utils';
import { MagazineStatus, MAGAZINE_STATUS_COLORS, MAGAZINE_STATUS_LABELS } from '@/types/magazine';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'gold' | 'department';
  status?: MagazineStatus;
}

export function Badge({
  className,
  variant = 'default',
  status,
  children,
  ...props
}: BadgeProps) {
  if (status) {
    const statusStyle = MAGAZINE_STATUS_COLORS[status];
    const statusLabel = MAGAZINE_STATUS_LABELS[status];
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-medium border uppercase tracking-wider',
          statusStyle.bg,
          statusStyle.text,
          statusStyle.border,
          className
        )}
        {...props}
      >
        {children || statusLabel}
      </span>
    );
  }

  const variants = {
    default: 'bg-[#E8E2D8] text-[#171717] border border-[#DCD5C9]',
    outline: 'bg-white text-[#44423E] border border-[#E2DBD0]',
    gold: 'bg-[#9E7D3B]/10 text-[#9E7D3B] border border-[#9E7D3B]/30',
    department: 'bg-[#171717] text-[#F8F6F1] font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
