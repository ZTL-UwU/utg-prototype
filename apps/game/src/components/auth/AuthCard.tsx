import type { ReactNode } from 'react';

import { Avatar } from './components/Avatar';
import { CloseButton } from './components/CloseButton';
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
    <div className="pointer-events-auto relative w-full max-w-md rounded-3xl bg-cream px-8 pt-16 pb-8 shadow-2xl">
      <Avatar variant={avatarVariant} className="absolute -top-12 left-1/2 -translate-x-1/2" />

      <CloseButton className="absolute top-4 left-4" onClick={onClose} />

      {children}
    </div>
  );
}
