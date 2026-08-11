import type { ButtonHTMLAttributes } from 'react';

import { cn } from './utils';

export type BackButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function BackButton({ className, ...props }: BackButtonProps) {
  return (
    <button
      type="button"
      aria-label="Back"
      className={cn(
        'grid size-10 place-items-center rounded-full text-ink transition duration-100',
        'hover:bg-ink/8 active:scale-90',
        'focus-visible:ring-4 focus-visible:ring-forest/40 focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
        <path
          d="M15 5 7 12l8 7"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
