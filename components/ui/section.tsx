import React from 'react';
import { cn } from '@/lib/utils';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  surface?: 'paper' | 'paper-light' | 'paper-dark' | 'ink' | 'cobalt' | 'terracotta' | 'transparent';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  dividerTop?: boolean;
  dividerBottom?: boolean;
}

export function Section({
  className,
  surface = 'transparent',
  spacing = 'lg',
  dividerTop = false,
  dividerBottom = false,
  children,
  ...props
}: SectionProps) {
  const surfaceClasses = {
    transparent: 'bg-transparent',
    paper: 'surface-paper',
    'paper-light': 'surface-paper-light',
    'paper-dark': 'surface-paper-dark',
    ink: 'surface-ink',
    cobalt: 'surface-cobalt',
    terracotta: 'surface-terracotta',
  };

  const spacingClasses = {
    none: 'py-0',
    sm: 'py-8 md:py-12',
    md: 'py-12 md:py-16',
    lg: 'py-16 md:py-20 lg:py-24',
    xl: 'py-20 md:py-28 lg:py-32',
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden transition-colors',
        surfaceClasses[surface],
        spacingClasses[spacing],
        dividerTop && 'border-t border-ink/15',
        dividerBottom && 'border-b border-ink/15',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
