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
          'inline-flex items-center rounded-xs px-2.5 py-1 text-xs sm:text-sm font-semibold font-label border uppercase tracking-wider',
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
    default: 'bg-paper-300/80 text-ink border border-ink/15 font-label',
    ink: 'bg-ink text-paper-50 border border-ink font-label',
    paper: 'bg-paper-50 text-ink border border-ink/20 font-label shadow-card',
    cobalt: 'bg-cobalt text-paper-50 border border-cobalt font-label',
    terracotta: 'bg-terracotta text-paper-50 border border-terracotta font-label',
    outline: 'bg-paper-50/70 text-ink/80 border border-ink/20 font-label',
    mono: 'bg-paper-100 text-graphite-dark border border-ink/15 font-metadata',
    gold: 'bg-terracotta/10 text-terracotta border border-terracotta/30 font-label',
    department: 'bg-ink text-paper-50 font-label tracking-widest border border-ink',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xs px-2.5 py-1 text-xs sm:text-sm font-semibold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
