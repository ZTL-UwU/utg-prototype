import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from './utils';

export interface LinkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function LinkButton({ children, className, type = 'button', ...props }: LinkButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'rounded-pill px-2 py-1 font-body text-base font-semibold text-muted transition',
        'hover:text-forest hover:underline hover:underline-offset-4',
        'focus-visible:ring-4 focus-visible:ring-forest/40 focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
