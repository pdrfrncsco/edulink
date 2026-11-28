'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles';

export type { ButtonVariant, ButtonSize };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

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
        className={buttonClassName({ variant, size, fullWidth, className })}
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
