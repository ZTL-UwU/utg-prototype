import type { ComponentProps } from 'react';

import { cn } from './utils';

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="card-title"
      className={cn(
        'text-center font-display text-3xl font-bold tracking-wide text-forest uppercase',
        className,
      )}
      {...props}
    />
  );
}
