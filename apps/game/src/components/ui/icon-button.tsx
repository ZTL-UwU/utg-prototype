import type { ComponentProps } from 'react';

import { Button } from './button';
import { DialogClose } from './dialog';

export type BackButtonProps = ComponentProps<typeof Button>;
export type CloseButtonProps = ComponentProps<typeof DialogClose>;

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
      <path
        d="M15 5 7 12l8 7"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
      <path d="M5 5 19 19M19 5 5 19" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function BackButton({ children, ...props }: BackButtonProps) {
  return (
    <Button variant="icon" aria-label="Back" {...props}>
      {children ?? <BackIcon />}
    </Button>
  );
}

/** Always a Base UI `Dialog.Close`, so Escape and the X share one dismiss path. */
export function CloseButton({ children, ...props }: CloseButtonProps) {
  return (
    <DialogClose render={<Button variant="icon" />} aria-label="Close" {...props}>
      {children ?? <CloseIcon />}
    </DialogClose>
  );
}
