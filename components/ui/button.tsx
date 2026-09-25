import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger'
    | 'ink'
    | 'terracotta'
    | 'cobalt'
    | 'paper';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none tracking-wider uppercase font-nav text-sm';

    const variants = {
      // Primary / Ink variants
      primary:
        'bg-ink text-paper-50 hover:bg-ink-light border border-ink focus:ring-ink shadow-editorial-sm active:translate-y-px',
      ink:
        'bg-ink text-paper-50 hover:bg-ink-light border border-ink focus:ring-ink shadow-editorial-sm active:translate-y-px',
      // Editorial color accents
      terracotta:
        'bg-terracotta text-paper-50 hover:bg-terracotta-700 border border-terracotta focus:ring-terracotta shadow-editorial-sm active:translate-y-px',
      cobalt:
        'bg-cobalt text-paper-50 hover:bg-cobalt-700 border border-cobalt focus:ring-cobalt shadow-editorial-sm active:translate-y-px',
      // Secondary / Paper variants
      secondary:
        'bg-paper-300 text-ink hover:bg-paper-400 border border-ink/15 focus:ring-ink/40',
      paper:
        'bg-paper-100 text-ink hover:bg-paper-50 border border-ink/20 focus:ring-ink/40 shadow-card',
      // Outline / Ghost / Danger
      outline:
        'border border-ink/25 bg-paper-50/80 text-ink hover:bg-ink hover:text-paper-50 hover:border-ink focus:ring-ink transition-colors',
      ghost:
        'text-graphite hover:text-ink hover:bg-paper-300/40 focus:ring-ink/20',
      danger:
        'bg-rose-700 text-white hover:bg-rose-800 border border-rose-800 focus:ring-rose-700',
    };

    const sizes = {
      sm: 'text-xs px-3.5 py-2 rounded-xs gap-1.5',
      md: 'text-sm px-5 py-2.5 rounded-xs gap-2',
      lg: 'text-base px-7 py-3.5 rounded-xs gap-2.5',
      icon: 'p-2.5 rounded-xs aspect-square',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
