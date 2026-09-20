import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './utils';

const pillLayout = [
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap',
  'mx-auto w-4/5 rounded-pill px-6 py-4.5 font-display text-2xl font-semibold',
];

const buttonVariants = cva(
  [
    'cursor-pointer outline-none select-none transition duration-100',
    'focus-visible:ring-4 focus-visible:ring-forest/40',
    'disabled:pointer-events-none disabled:opacity-60',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** Forest CTA — the main action on every card. */
        primary: [
          ...pillLayout,
          'bg-forest text-cream shadow-[0_4px_0_0_var(--color-forest-dark)]',
          'hover:bg-forest-dark active:translate-y-[2px] active:scale-[0.97] active:shadow-[0_2px_0_0_var(--color-forest-dark)]',
          'disabled:active:translate-y-0 disabled:active:scale-100',
        ],
        /** Outlined cream secondary action. */
        secondary: [
          ...pillLayout,
          'border-2 border-ink bg-cream text-ink shadow-[0_4px_0_0_var(--color-ink)]',
          'hover:bg-forest/10 active:translate-y-[2px] active:scale-[0.97] active:shadow-[0_2px_0_0_var(--color-ink)]',
          'disabled:active:translate-y-0 disabled:active:scale-100',
        ],
        /** Quiet text action (forgot password, back to login). */
        link: [
          'inline-flex items-center justify-center self-center rounded-pill px-2 py-1',
          'font-body text-base font-semibold text-muted',
          'hover:text-forest hover:underline hover:underline-offset-4',
        ],
        /** Round icon action (back / close in card corners). */
        icon: [
          'inline-flex size-10 shrink-0 items-center justify-center rounded-full font-body text-ink',
          'hover:bg-ink/8 active:scale-90',
        ],
        /** Clickable surface with no pill chrome (team cards). */
        ghost: 'flex',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

export interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant ?? 'primary'}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}
