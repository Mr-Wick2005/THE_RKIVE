import React from 'react';
import { cn } from '@/lib/utils';

export interface PaperSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'elevated' | 'framed' | 'sheet';
}

export function PaperSurface({
  className,
  variant = 'framed',
  children,
  ...props
}: PaperSurfaceProps) {
  const variantClasses = {
    flat: 'bg-paper-100 border border-ink/12',
    elevated: 'bg-paper-50 border border-ink/15 shadow-editorial',
    framed: 'bg-paper-50 border border-ink/20 shadow-card p-6 sm:p-8',
    sheet: 'bg-paper-50 border-y border-ink/15 py-8 px-6 sm:px-10',
  };

  return (
    <div
      className={cn('relative transition-all rounded-none', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
