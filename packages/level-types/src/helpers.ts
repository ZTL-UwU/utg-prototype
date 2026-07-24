import type { z } from 'zod';

import { LEVEL_TYPES, type LevelTypeId, type LevelTypeProps } from './registry';

export function isLevelTypeId(value: string): value is LevelTypeId {
  return value in LEVEL_TYPES;
}

export function getLevelType<T extends LevelTypeId>(levelType: T): (typeof LEVEL_TYPES)[T] {
  return LEVEL_TYPES[levelType];
}

export function levelTypeLabel(levelType: string): string {
  if (isLevelTypeId(levelType)) {
    return LEVEL_TYPES[levelType].label;
  }
  return levelType;
}

export function defaultLevelProps<T extends LevelTypeId>(levelType: T): LevelTypeProps[T] {
  return LEVEL_TYPES[levelType].defaultProps() as LevelTypeProps[T];
}

/**
 * Parse props for a level type. Merges with defaults first so partial/legacy
 * JSON (e.g. partial props objects) still succeeds. On invalid
 * data, falls back to defaults so admin editors can still open.
 */
export function parseLevelProps<T extends LevelTypeId>(
  levelType: T,
  value: unknown,
): LevelTypeProps[T] {
  const defaults = defaultLevelProps(levelType);
  const merged =
    value != null && typeof value === 'object' && !Array.isArray(value)
      ? { ...defaults, ...(value as Record<string, unknown>) }
      : defaults;
  const parsed = safeParseLevelProps(levelType, merged);
  return parsed.success ? parsed.data : defaults;
}

export function safeParseLevelProps<T extends LevelTypeId>(
  levelType: T,
  value: unknown,
): z.ZodSafeParseResult<LevelTypeProps[T]> {
  return LEVEL_TYPES[levelType].propsSchema.safeParse(value) as z.ZodSafeParseResult<
    LevelTypeProps[T]
  >;
}
