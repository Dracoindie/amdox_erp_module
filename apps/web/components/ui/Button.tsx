'use client';

import { forwardRef, type ButtonHTMLAttributes, type ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-xs hover:bg-primary-hover',
  secondary: 'border border-line-strong bg-surface text-fg shadow-xs hover:bg-surface-2',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger-solid text-white shadow-xs hover:brightness-110',
};

// Touch targets: 40 px tall on phones, 36 px from `sm` up (32 / 36 for small buttons).
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs sm:h-8 sm:px-2.5',
  md: 'h-10 px-4 text-sm sm:h-9 sm:px-3.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
  icon?: ComponentType<{ className?: string }>;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-55',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className={cx(iconClass, 'animate-spin')} aria-hidden /> : Icon && <Icon className={iconClass} aria-hidden />}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need an accessible name. */
  'aria-label': string;
  icon: ComponentType<{ className?: string }>;
  variant?: 'ghost' | 'secondary';
  size?: ButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, variant = 'ghost', size = 'md', className, type = 'button', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-9 w-9 sm:h-8 sm:w-8' : 'h-10 w-10 sm:h-9 sm:w-9',
        variant === 'secondary'
          ? 'border border-line bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg'
          : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        className,
      )}
      {...props}
    >
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} aria-hidden />
      {children}
    </button>
  );
});
