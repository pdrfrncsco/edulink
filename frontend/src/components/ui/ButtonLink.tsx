import React from 'react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles';

export interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

/** Server-safe anchor styled with standard EduLink button variants and touch targets. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <a className={buttonClassName({ variant, size, fullWidth, className })} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </a>
  );
}
