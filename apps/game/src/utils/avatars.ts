/**
 * Single source of truth for avatar rendering.
 *
 * A user's chosen avatar is stored as a single integer (see `AuthUser.avatar` in
 * `src/zustandStores/auth.ts`). This module is the ONLY place that maps that integer to a
 * texture alias / lock state — never hardcode avatar paths elsewhere. Any screen or widget
 * that renders an avatar should resolve its path through {@link getAvatarPath}.
 *
 * Paths are AssetPack aliases (folder-relative), resolved via `Texture.from` / `Assets`.
 * The referenced art lives in the `avatar-select` bundle (`assets/avatar-select{m}/`).
 */
export interface AvatarDef {
  /** The integer stored on the user object. */
  id: number;
  /** Texture alias, resolved via `Texture.from` / `Assets`. */
  path: string;
  /** Whether the avatar is selectable yet. Locked avatars render as a padlock. */
  locked: boolean;
}

export const AVATARS: readonly AvatarDef[] = [
  { id: 0, path: 'avatar-select/goat.png', locked: false },
  { id: 1, path: 'avatar-select/pig.png', locked: false },
  { id: 2, path: 'avatar-select/horse.png', locked: false },
  { id: 3, path: 'avatar-select/locked.png', locked: true },
  { id: 4, path: 'avatar-select/locked.png', locked: true },
  { id: 5, path: 'avatar-select/locked.png', locked: true },
];

/** Fallback avatar id used when a user has no avatar set yet. */
export const DEFAULT_AVATAR_ID = 0;

/** Look up an avatar definition, falling back to the default for unknown/undefined ids. */
export function getAvatarDef(id: number | null | undefined): AvatarDef {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[DEFAULT_AVATAR_ID];
}

/** Integer → texture alias. Falls back to the default avatar for unknown/undefined ids. */
export function getAvatarPath(id: number | null | undefined): string {
  return getAvatarDef(id).path;
}

/** Whether the given avatar id exists and is unlocked (selectable). */
export function isAvatarUnlocked(id: number): boolean {
  return AVATARS.some((avatar) => avatar.id === id && !avatar.locked);
}
