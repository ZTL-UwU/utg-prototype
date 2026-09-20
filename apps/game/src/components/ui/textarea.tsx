import type { ComponentProps } from 'react';

import { cn } from './utils';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'w-full resize-none rounded-2xl border-[3px] border-forest bg-cream px-4 py-3',
        'font-body text-xl text-ink outline-none',
        'focus-visible:ring-4 focus-visible:ring-forest/30',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
