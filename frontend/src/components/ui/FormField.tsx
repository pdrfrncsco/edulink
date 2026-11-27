'use client';

import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from './cn';

export interface FormFieldProps {
  id?: string;
  label: string;
  required?: boolean;
  /** Displayed above the control so mobile keyboards and autofill popovers do not cover it. */
  hint?: string;
  error?: string;
  className?: string;
  children:
    | React.ReactNode
    | ((fieldProps: {
        id: string;
        describedBy?: string;
        invalid: boolean;
      }) => React.ReactNode);
}

/**
 * Accessible field wrapper linking `<label htmlFor>`, above-input hint, and validation error.
 */
export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const describedByParts: string[] = [];
  if (hint) describedByParts.push(hintId);
  if (error) describedByParts.push(errorId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={fieldId} className="block text-xs font-semibold uppercase text-stone-700">
        {label}{' '}
        {required && (
          <span aria-hidden="true" className="text-red-600">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-xs text-stone-500 leading-snug">
          {hint}
        </p>
      )}

      <div>
        {typeof children === 'function'
          ? children({ id: fieldId, describedBy, invalid: Boolean(error) })
          : children}
      </div>

      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-xs font-medium text-red-700 pt-0.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ invalid = false, mono = false, className, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid ? 'true' : 'false'}
      className={cn(
        'edulink-input w-full px-3.5 py-2 rounded-xl border bg-white text-sm text-stone-900 placeholder:text-stone-400',
        invalid ? 'border-red-500 bg-red-50/40' : 'border-stone-300',
        mono && 'font-mono',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid = false, className, children, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid ? 'true' : 'false'}
      className={cn(
        'edulink-input w-full px-3.5 py-2 rounded-xl border bg-white text-sm text-stone-900',
        invalid ? 'border-red-500 bg-red-50/40' : 'border-stone-300',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid = false, className, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid ? 'true' : 'false'}
      className={cn(
        'edulink-input w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm text-stone-900 placeholder:text-stone-400',
        invalid ? 'border-red-500 bg-red-50/40' : 'border-stone-300',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
