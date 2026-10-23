import * as React from 'react';
import { cn } from '@/lib/utils';
import { MagazineStatus, MAGAZINE_STATUS_COLORS, MAGAZINE_STATUS_LABELS } from '@/types/magazine';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'outline'
    | 'gold'
    | 'department'
    | 'ink'
    | 'paper'
    | 'cobalt'
    | 'terracotta'
    | 'mono';
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
          'inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs sm:text-[13px] font-medium border tracking-normal',
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
    default: 'bg-paper-300/80 text-ink border border-ink/15',
    ink: 'bg-ink text-paper-50 border border-ink',
    paper: 'bg-paper-50 text-ink border border-ink/20 shadow-card',
    cobalt: 'bg-cobalt text-paper-50 border border-cobalt',
    terracotta: 'bg-terracotta text-paper-50 border border-terracotta',
    outline: 'bg-paper-50/70 text-ink/80 border border-ink/20',
    mono: 'bg-paper-100 text-graphite-dark border border-ink/15 font-mono',
    gold: 'bg-amber-500/10 text-amber-800 border border-amber-500/30 font-medium',
    department: 'bg-ink text-paper-50 border border-ink',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs sm:text-[13px] font-medium tracking-normal',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
