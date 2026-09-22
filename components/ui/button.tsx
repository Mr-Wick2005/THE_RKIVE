import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
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
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none tracking-wide';

    const variants = {
      primary:
        'bg-[#171717] text-[#F8F6F1] hover:bg-[#2C2C2A] focus:ring-[#171717] shadow-sm active:scale-[0.99]',
      secondary:
        'bg-[#E8E2D8] text-[#171717] hover:bg-[#DCD5C9] focus:ring-[#77736C]',
      outline:
        'border border-[#E2DBD0] bg-white text-[#171717] hover:bg-[#F8F6F1] hover:border-[#CFC7BA] focus:ring-[#9E7D3B]',
      ghost:
        'text-[#77736C] hover:text-[#171717] hover:bg-[#E8E2D8]/40 focus:ring-[#77736C]',
      danger:
        'bg-rose-700 text-white hover:bg-rose-800 focus:ring-rose-700',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 rounded-sm gap-1.5',
      md: 'text-sm px-4 py-2 rounded-sm gap-2',
      lg: 'text-base px-6 py-2.5 rounded-sm gap-2.5',
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
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
