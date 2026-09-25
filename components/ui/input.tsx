import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold uppercase tracking-wider text-[#2E2B26]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-sm border border-[#2C2824]/20 bg-white px-4 py-2.5 text-base text-[#121210] placeholder:text-[#55524D] transition-colors focus:border-[#121210] focus:outline-none focus:ring-1 focus:ring-[#121210] disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-sm text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-sm text-[#55524D]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
