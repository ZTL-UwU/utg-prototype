import type { ReactNode } from 'react';

import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { CloseButton } from '../ui/CloseButton';
import type { AvatarVariant } from './types';

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
    <Card>
      <Avatar variant={avatarVariant} className="absolute -top-12 left-1/2 -translate-x-1/2" />

      <CloseButton className="absolute top-4 left-4" onClick={onClose} />

      {/* Scrolling lives here, not on the card — the avatar overhangs the card's edge. */}
      <div className="flex flex-col overflow-y-auto py-2">{children}</div>
    </Card>
  );
}
