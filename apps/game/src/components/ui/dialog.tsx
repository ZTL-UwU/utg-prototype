import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';

import { cn } from './utils';

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn('fixed inset-0 z-40 bg-black/40', className)}
      {...props}
    />
  );
}

export interface DialogPopupProps extends DialogPrimitive.Popup.Props {
  /** Top-edge medallion (e.g. the auth avatar). Rendered overhanging the card. */
  badge?: ReactNode;
  /** Dim the game behind the card. Defaults to `true`. */
  backdrop?: boolean;
  /** `card` is the cream overlay; `panel` is the nested white sheet. */
  variant?: 'card' | 'panel';
}

const popupVariants = {
  card: 'max-h-[92vh] min-h-[62vh] max-w-4xl justify-center rounded-3xl bg-cream px-5 pt-16 pb-8 shadow-2xl md:px-10',
  panel:
    'max-w-5xl min-h-0 justify-start gap-8 overflow-y-auto rounded-[16px] border border-ink/15 bg-white px-10 py-10 shadow-2xl',
} as const;

/**
 * The cream game card. Used for auth, menu, and popups so every overlay
 * shares one surface, one radius, and one shadow.
 */
function DialogPopup({
  className,
  badge,
  backdrop = true,
  variant = 'card',
  children,
  ...props
}: DialogPopupProps) {
  return (
    <DialogPrimitive.Portal>
      {backdrop ? <DialogBackdrop /> : null}
      <DialogPrimitive.Viewport
        data-slot="dialog-viewport"
        className="pointer-events-none fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"
      >
        <DialogPrimitive.Popup
          data-slot="dialog-popup"
          data-variant={variant}
          className={cn(
            'pointer-events-auto relative flex w-full flex-col',
            popupVariants[variant],
            className,
          )}
          {...props}
        >
          {badge}
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-center font-display text-4xl font-semibold text-ink', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-center font-body text-lg text-muted', className)}
      {...props}
    />
  );
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export { Dialog, DialogPopup, DialogTitle, DialogDescription, DialogClose };
