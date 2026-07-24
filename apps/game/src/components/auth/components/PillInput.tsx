import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '../utils';

export interface PillInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Doubles as the accessible name unless `aria-label` is passed explicitly. */
  placeholder: string;
}

export const PillInput = forwardRef<HTMLInputElement, PillInputProps>(function PillInput(
  { className, placeholder, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      placeholder={placeholder}
      aria-label={placeholder}
      className={cn(
        'w-full rounded-pill border-2 border-ink bg-cream px-5 py-3 font-body text-base text-ink',
        'shadow-[0_2px_0_0_var(--color-ink)] transition outline-none placeholder:text-muted',
        'focus-visible:border-forest focus-visible:ring-4 focus-visible:ring-forest/30',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});
