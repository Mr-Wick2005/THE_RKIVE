import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  linkHref?: string;
  linkLabel?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  linkHref,
  linkLabel,
  align = 'left',
  className,
}: SectionHeadingProps) {
  const isCenter = align === 'center';

  return (
    <div
      className={cn(
        'mb-10 pb-4 border-b border-[#E8E2D8] flex flex-col md:flex-row md:items-end justify-between gap-4',
        isCenter && 'text-center md:items-center',
        className
      )}
    >
      <div className={cn(isCenter && 'mx-auto')}>
        {eyebrow && (
          <span className="text-[11px] uppercase tracking-widest font-semibold text-[#B58A55] block mb-1">
            {eyebrow}
          </span>
        )}
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-[#171717]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#77736C] max-w-2xl mt-1.5 font-light leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-[#171717] hover:text-[#B58A55] transition-colors self-start md:self-end flex-shrink-0 group"
        >
          <span>{linkLabel}</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
