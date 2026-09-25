import React from 'react';
import { cn } from '@/lib/utils';

export interface EditorialDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'single' | 'double' | 'dashed' | 'ornament';
  ornamentText?: string;
}

export function EditorialDivider({
  className,
  variant = 'single',
  ornamentText,
  ...props
}: EditorialDividerProps) {
  if (variant === 'double') {
    return (
      <div className={cn('py-4 w-full', className)} {...props}>
        <div className="editorial-rule-double" />
      </div>
    );
  }

  if (variant === 'dashed') {
    return (
      <div className={cn('py-4 w-full', className)} {...props}>
        <div className="editorial-rule-dashed" />
      </div>
    );
  }

  if (variant === 'ornament') {
    return (
      <div className={cn('flex items-center gap-4 py-6 w-full', className)} {...props}>
        <div className="flex-1 h-px bg-ink/15" />
        <span className="font-metadata text-[10px] text-graphite tracking-[0.2em] uppercase select-none">
          {ornamentText || '✦ THE RKIVE ✦'}
        </span>
        <div className="flex-1 h-px bg-ink/15" />
      </div>
    );
  }

  return (
    <div className={cn('py-2 w-full', className)} {...props}>
      <div className="editorial-rule" />
    </div>
  );
}
