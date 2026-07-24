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
        'mx-auto w-4/5 rounded-pill border-[3px] border-ink bg-cream px-5 py-4.5 text-center',
        'font-body text-base text-ink',
        'shadow-[0_3px_0_0_var(--color-ink)] transition outline-none placeholder:text-muted',
        'focus-visible:border-forest focus-visible:ring-4 focus-visible:ring-forest/30',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});
