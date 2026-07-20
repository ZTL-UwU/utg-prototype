import type { LevelTypeId } from '@utg/level-types';

import { EducationLevelScreen } from '../education-level/level-1';
import { EducationBubbleScreen } from '../education-level/level-2';
import { EducationSheepScreen } from '../education-level/level-3';
import { EducationImageScreen } from '../education-level/level-4';
import { EducationWordScreen } from '../education-level/level-5';
import { EducationSheepJumpScreen } from '../education-level/level-6';
import { EducationWhackAMoleScreen } from '../education-level/level-7';
import { GameLevelOneScreen } from '../game-level/level-1';
import { TypingLevelScreen } from '../typing-level/level-1';
import { TypingSandstormScreen } from '../typing-level/level-2';
import { TypingInstrumentScreen } from '../typing-level/level-3';
import { TypingWordScreen } from '../typing-level/level-4';
import { TypingMarketScreen } from '../typing-level/level-5';
import type { LevelScreenConstructor } from './units';

/** Maps backend `level_type` ids to Pixi screen constructors. */
export const LEVEL_TYPE_SCREENS: Record<LevelTypeId, LevelScreenConstructor> = {
  'education-letter-grid': EducationLevelScreen,
  'education-bubble': EducationBubbleScreen,
  'education-sheep': EducationSheepScreen,
  'education-image': EducationImageScreen,
  'education-word': EducationWordScreen,
  'education-sheep-jump': EducationSheepJumpScreen,
  'education-whack-a-mole': EducationWhackAMoleScreen,
  'typing-desert': TypingLevelScreen,
  'typing-sandstorm': TypingSandstormScreen,
  'typing-instrument': TypingInstrumentScreen,
  'typing-word': TypingWordScreen,
  'typing-market': TypingMarketScreen,
  'game-tandoor-rush': GameLevelOneScreen,
};
