import { z } from 'zod';

import type { LevelTypeConfig } from './define';
import { educationLetterGrid } from './types/education-letter-grid';

/**
 * Source of truth for level type ids, labels, and props schemas.
 *
 * To add a type:
 * 1. Create `src/types/<id>.ts` with `defineLevelType(...)`.
 * 2. Register it below (key must match the id string used by the API/DB).
 * 3. Register the admin props form in `@utg/admin` `level-type-forms`.
 * 4. Keep the Django `LevelType` allow-list in sync.
 */
export const LEVEL_TYPES = {
  'education-letter-grid': educationLetterGrid,
} as const satisfies Record<string, LevelTypeConfig>;

export type LevelTypeId = keyof typeof LEVEL_TYPES;

export const LEVEL_TYPE_IDS = Object.keys(LEVEL_TYPES) as [LevelTypeId, ...LevelTypeId[]];

/** Zod enum of registered level type ids — reuse in forms/API validation. */
export const levelTypeIdSchema = z.enum(LEVEL_TYPE_IDS);

export type LevelTypeProps = {
  [K in LevelTypeId]: z.infer<(typeof LEVEL_TYPES)[K]['propsSchema']>;
};
