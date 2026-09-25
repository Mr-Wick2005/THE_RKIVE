import React from 'react';
import { cn } from '@/lib/utils';

export interface ImageFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  passePartout?: boolean;
  aspect?: 'magazine' | 'landscape' | 'spread' | 'square' | 'auto';
  caption?: string;
}

export function ImageFrame({
  className,
  passePartout = false,
  aspect = 'auto',
  caption,
  children,
  ...props
}: ImageFrameProps) {
  const aspectClasses = {
    magazine: 'aspect-magazine',
    landscape: 'aspect-landscape',
    spread: 'aspect-spread',
    square: 'aspect-square',
    auto: '',
  };

  return (
    <figure className={cn('relative group', className)} {...props}>
      <div
        className={cn(
          'relative border border-ink/20 bg-paper-100 overflow-hidden shadow-card transition-all duration-300',
          passePartout && 'p-3 sm:p-4 bg-paper-50 border-ink/25',
          aspectClasses[aspect]
        )}
      >
        {children}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center font-metadata text-graphite text-[10px]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
