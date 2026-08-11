import { cn } from './utils';

export type AvatarVariant = 'outline' | 'filled';

export interface AvatarProps {
  variant?: AvatarVariant;
  className?: string;
}

/**
 * The medallion that overhangs the card's top edge. Outline while the player is
 * still signing in, filled once they're through.
 */
export function Avatar({ variant = 'outline', className }: AvatarProps) {
  const fill = variant === 'filled' ? 'var(--color-forest)' : 'transparent';

  return (
    <div
      className={cn(
        'grid size-24 place-items-center rounded-full border-[3px] border-ink bg-cream',
        'shadow-[0_6px_14px_rgba(28,28,28,0.28)]',
        className,
      )}
    >
      <svg viewBox="0 0 48 48" className="size-14" fill="none" aria-hidden="true">
        <circle
          cx="24"
          cy="17"
          r="8.5"
          fill={fill}
          stroke="var(--color-ink)"
          strokeWidth="3"
          className="transition-[fill] duration-300"
        />
        <path
          d="M9.5 41.5a14.5 14.5 0 0 1 29 0"
          fill={fill}
          stroke="var(--color-ink)"
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-[fill] duration-300"
        />
      </svg>
    </div>
  );
}
