import { PlusIcon } from 'lucide-react';

import { cn } from '~/lib/utils';

export function RewardThumbButton({
  imageUrl,
  label,
  assigned,
  size = 'md',
  title,
  disabled = false,
  onClick,
}: {
  imageUrl?: string;
  label: string;
  assigned: boolean;
  size?: 'sm' | 'md';
  title?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-label={assigned ? `Change ${label} image` : `Assign ${label} image`}
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        size === 'md' ? 'size-16' : 'size-12',
        assigned
          ? 'bg-muted/60 ring-1 ring-foreground/10'
          : 'border border-dashed border-input text-muted-foreground',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : assigned
            ? 'hover:ring-2 hover:ring-primary/60'
            : 'hover:border-primary/60 hover:bg-muted/40 hover:text-primary',
      )}
    >
      {imageUrl ? (
        // Badge art is transparent and rarely square, so contain it instead of cropping.
        <img src={imageUrl} alt="" className="size-full object-contain p-1" />
      ) : (
        <PlusIcon className={size === 'md' ? 'size-5' : 'size-4'} />
      )}
    </button>
  );
}
