import React from 'react';
import { cn } from '@/lib/utils';

export interface MetadataProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  value?: string | number | React.ReactNode;
  variant?: 'inline' | 'stacked' | 'pill';
}

export function Metadata({
  label,
  value,
  variant = 'stacked',
  className,
  children,
  ...props
}: MetadataProps) {
  if (variant === 'inline') {
    return (
      <div className={cn('inline-flex items-center gap-2 font-metadata text-graphite', className)} {...props}>
        {label && <span className="text-graphite-dark font-medium">{label}:</span>}
        <span className="text-ink">{value || children}</span>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none border border-ink/15 bg-paper-100/80 font-metadata text-ink',
          className
        )}
        {...props}
      >
        {label && <span className="text-graphite">{label}</span>}
        {label && <span className="text-ink/30">•</span>}
        <span className="font-semibold">{value || children}</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-0.5', className)} {...props}>
      {label && <span className="block font-label text-graphite">{label}</span>}
      <span className="block font-mono text-xs font-semibold text-ink">
        {value || children}
      </span>
    </div>
  );
}
