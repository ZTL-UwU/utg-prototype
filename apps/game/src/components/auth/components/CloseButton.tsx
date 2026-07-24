import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../utils';

export type CloseButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function CloseButton({ className, ...props }: CloseButtonProps) {
  return (
    <button
      type="button"
      aria-label="Close"
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
          d="M5 5 19 19M19 5 5 19"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
