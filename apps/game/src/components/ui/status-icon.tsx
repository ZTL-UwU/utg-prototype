import { cn } from './utils';

export function StatusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      data-slot="status-icon"
      className={cn('size-16 text-forest', className)}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="27" stroke="currentColor" strokeWidth="4" />
      <circle cx="23" cy="27" r="3.2" fill="currentColor" />
      <circle cx="41" cy="27" r="3.2" fill="currentColor" />
      <path
        d="M21 38a13 13 0 0 0 22 0"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
