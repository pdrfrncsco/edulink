'use client';

import React, { useId } from 'react';
import { cn } from './cn';

export interface CheckboxFieldProps {
  id?: string;
  name?: string;
  label: React.ReactNode;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Accessible checkbox field with 44px touch-friendly alignment and EduLink brand accent. */
export function CheckboxField({
  id,
  name,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className,
}: CheckboxFieldProps) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={fieldId}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-teal-700 w-4 h-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <label
        htmlFor={fieldId}
        className="text-sm text-stone-700 cursor-pointer leading-snug select-none"
      >
        <span className="block">{label}</span>
        {description && <span className="block text-xs text-stone-500 mt-0.5">{description}</span>}
      </label>
    </div>
  );
}
