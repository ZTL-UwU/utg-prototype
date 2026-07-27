import type { ReactNode } from 'react';

import { Avatar } from './components/Avatar';
import { CloseButton } from './components/CloseButton';
import type { AvatarVariant } from './types';
import { cn } from './utils';

export interface AuthCardProps {
  avatarVariant: AvatarVariant;
  onClose?: () => void;
  children: ReactNode;
}

/**
 * The persistent shell. Mounted once by `AuthParent` and never swapped, so the
 * avatar and the X hold still while the screen inside them changes.
 */
export function AuthCard({ avatarVariant, onClose, children }: AuthCardProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto relative flex h-[62vh] w-[50vw] flex-col',
        'min-h-120 min-w-[20rem]',
        'rounded-3xl bg-cream px-24 pt-16 pb-8 shadow-2xl',
      )}
    >
      <Avatar variant={avatarVariant} className="absolute -top-12 left-1/2 -translate-x-1/2" />

      <CloseButton className="absolute top-4 left-4" onClick={onClose} />

      {/* Scrolling lives here, not on the card — the avatar overhangs the card's edge. */}
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto">{children}</div>
    </div>
  );
}
