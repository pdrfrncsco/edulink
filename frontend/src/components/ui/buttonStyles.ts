import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-solid';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 border border-transparent shadow-sm',
  secondary: 'bg-stone-900 text-white hover:bg-stone-800 border border-transparent shadow-sm',
  outline: 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50',
  ghost: 'bg-transparent text-stone-600 border border-transparent hover:bg-stone-100 hover:text-stone-900',
  danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  'danger-solid': 'bg-red-600 text-white border border-transparent hover:bg-red-700 shadow-sm',
};

export const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[34px] px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'min-h-[40px] px-4 py-2 text-xs sm:text-sm rounded-xl gap-2',
  lg: 'min-h-[44px] px-5 py-2.5 text-sm rounded-xl gap-2',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** Computes shared Tailwind class list for EduLink buttons and link-buttons. */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    'inline-flex items-center justify-center font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed',
    BUTTON_VARIANT_CLASSES[variant],
    BUTTON_SIZE_CLASSES[size],
    fullWidth && 'w-full',
    className
  );
}
