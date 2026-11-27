'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-solid';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 border border-transparent shadow-sm',
  secondary: 'bg-stone-900 text-white hover:bg-stone-800 border border-transparent shadow-sm',
  outline: 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50',
  ghost: 'bg-transparent text-stone-600 border border-transparent hover:bg-stone-100 hover:text-stone-900',
  danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  'danger-solid': 'bg-red-600 text-white border border-transparent hover:bg-red-700 shadow-sm',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[34px] px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'min-h-[40px] px-4 py-2 text-xs sm:text-sm rounded-xl gap-2',
  lg: 'min-h-[44px] px-5 py-2.5 text-sm rounded-xl gap-2',
};

/** Standard EduLink action button with loading state and semantic variants. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      type = 'button',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
