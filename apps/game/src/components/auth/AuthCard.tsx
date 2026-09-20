import type { ReactNode } from 'react';

import { Avatar, type AvatarVariant, CloseButton, DialogPopup } from '../ui';

export interface AuthCardProps {
  avatarVariant: AvatarVariant;
  /** Dim the game behind the card. Defaults to `false`. */
  backdrop?: boolean;
  children: ReactNode;
}

/**
 * The persistent shell. Mounted once by `AuthParent` and never swapped, so the
 * avatar and the X hold still while the screen inside them changes.
 */
export function AuthCard({ avatarVariant, backdrop = false, children }: AuthCardProps) {
  return (
    <DialogPopup
      backdrop={backdrop}
      badge={
        <Avatar variant={avatarVariant} className="absolute -top-12 left-1/2 -translate-x-1/2" />
      }
    >
      <CloseButton className="absolute top-4 left-4" />

      {/* Scrolling lives here, not on the card — the avatar overhangs the card's edge. */}
      <div className="flex flex-col overflow-y-auto py-2">{children}</div>
    </DialogPopup>
  );
}
