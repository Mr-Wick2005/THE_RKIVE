import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  external?: boolean;
  withArrow?: boolean;
}

export function TextLink({
  href,
  external = false,
  withArrow = false,
  className,
  children,
  ...props
}: TextLinkProps) {
  const classes = cn(
    'inline-flex items-center gap-1 font-nav text-ink hover:text-terracotta transition-colors border-b border-ink/30 hover:border-terracotta pb-0.5 group',
    className
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...props}
      >
        <span>{children}</span>
        {withArrow && (
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      <span>{children}</span>
      {withArrow && (
        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
    </Link>
  );
}
