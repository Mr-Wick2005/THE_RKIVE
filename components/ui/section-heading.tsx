import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SectionHeadingProps {
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
        'mb-10 pb-5 border-b-2 border-[#1A1A1A] flex flex-col md:flex-row md:items-end justify-between gap-4',
        isCenter && 'text-center md:items-center',
        className
      )}
    >
      <div className={cn(isCenter && 'mx-auto')}>
        {eyebrow && (
          <span className="font-mono text-sm sm:text-base font-bold text-[#C24A26] uppercase tracking-widest block mb-2.5">
            {eyebrow}
          </span>
        )}
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1A1A1A] font-semibold tracking-tight leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="font-sans text-lg sm:text-xl text-[#3E3C38] max-w-3xl mt-3 font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="inline-flex items-center gap-2 font-mono text-sm sm:text-base font-bold text-[#1A1A1A] hover:text-[#FAF7F2] hover:bg-[#1A1A1A] transition-all self-start md:self-end flex-shrink-0 group uppercase tracking-wider bg-[#F4EFEB] border-2 border-[#1A1A1A] px-5 py-3 rounded-none shadow-[2px_2px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1B44B8]"
        >
          <span>{linkLabel}</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
