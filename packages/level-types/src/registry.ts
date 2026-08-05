import { z } from 'zod';

import type { LevelTypeConfig } from './define';
import { educationBubble } from './types/education-bubble';
import { educationImage } from './types/education-image';
import { educationLetterGrid } from './types/education-letter-grid';
import { educationSheep } from './types/education-sheep';
import { educationSheepJump } from './types/education-sheep-jump';
import { educationWhackAMole } from './types/education-whack-a-mole';
import { educationWord } from './types/education-word';
import { gameFlying } from './types/game-flying';
import { gameFruitFall } from './types/game-fruit-fall';
import { gameNaanStack } from './types/game-naan-stack';
import { gameTandoorRush } from './types/game-tandoor-rush';
import { typingDesert } from './types/typing-desert';
import { typingInstrument } from './types/typing-instrument';
import { typingMarket } from './types/typing-market';
import { typingSandstorm } from './types/typing-sandstorm';
import { typingStory } from './types/typing-story';
import { typingWord } from './types/typing-word';

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
  'education-bubble': educationBubble,
  'education-sheep': educationSheep,
  'education-image': educationImage,
  'education-word': educationWord,
  'education-sheep-jump': educationSheepJump,
  'education-whack-a-mole': educationWhackAMole,
  'typing-desert': typingDesert,
  'typing-sandstorm': typingSandstorm,
  'typing-instrument': typingInstrument,
  'typing-word': typingWord,
  'typing-market': typingMarket,
  'typing-story': typingStory,
  'game-tandoor-rush': gameTandoorRush,
  'game-fruit-fall': gameFruitFall,
  'game-naan-stack': gameNaanStack,
  'game-flying': gameFlying,
} as const satisfies Record<string, LevelTypeConfig>;

export type LevelTypeId = keyof typeof LEVEL_TYPES;

export const LEVEL_TYPE_IDS = Object.keys(LEVEL_TYPES) as [LevelTypeId, ...LevelTypeId[]];

/** Zod enum of registered level type ids — reuse in forms/API validation. */
export const levelTypeIdSchema = z.enum(LEVEL_TYPE_IDS);

export type LevelTypeProps = {
  [K in LevelTypeId]: z.infer<(typeof LEVEL_TYPES)[K]['propsSchema']>;
};
