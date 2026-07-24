import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../utils';

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** `solid` is the forest CTA, `ghost` the outlined secondary action. */
  variant?: 'solid' | 'ghost';
}

const VARIANTS = {
  solid: cn(
    'bg-forest text-cream shadow-[0_4px_0_0_var(--color-forest-dark)]',
    'hover:bg-forest-dark active:shadow-[0_2px_0_0_var(--color-forest-dark)]',
  ),
  ghost: cn(
    'border-2 border-ink bg-cream text-ink shadow-[0_4px_0_0_var(--color-ink)]',
    'hover:bg-forest/10 active:shadow-[0_2px_0_0_var(--color-ink)]',
  ),
};

export function PrimaryButton({
  children,
  className,
  variant = 'solid',
  type = 'button',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'w-full rounded-pill px-6 py-3 font-display text-lg font-semibold transition duration-100',
        'active:translate-y-[2px] active:scale-[0.97]',
        'focus-visible:ring-4 focus-visible:ring-forest/40 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'disabled:active:translate-y-0 disabled:active:scale-100',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
