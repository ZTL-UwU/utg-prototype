import { type LevelTypeId } from '@utg/level-types';

import { EducationBubbleScreen } from '../education-level/level-bubble';
import { EducationImageScreen } from '../education-level/level-image';
import { EducationLevelScreen } from '../education-level/level-letter-grid';
import { EducationSheepScreen } from '../education-level/level-sheep';
import { EducationSheepJumpScreen } from '../education-level/level-sheep-jump';
import { EducationWhackAMoleScreen } from '../education-level/level-whack-a-mole';
import { EducationWordScreen } from '../education-level/level-word';
import { GameLevelFlying } from '../game-level/level-flying';
import { GameLevelFruitScreen } from '../game-level/level-fruit-fall';
import { GameLevelKite } from '../game-level/level-kite';
import { GameNaanStackScreen } from '../game-level/level-naan-stack';
import { GameLevelSki } from '../game-level/level-ski';
import { GameLevelOneScreen } from '../game-level/level-tandoor-rush';
import { GameLevelTrout } from '../game-level/level-trout';
import { TypingLevelScreen } from '../typing-level/level-desert';
import { TypingGoatsScreen } from '../typing-level/level-goat';
import { TypingInstrumentScreen } from '../typing-level/level-instrument';
import { TypingMarketScreen } from '../typing-level/level-market';
import { TypingSandstormScreen } from '../typing-level/level-sandstorm';
import { TypingSentenceScreen } from '../typing-level/level-story';
import { TypingWordScreen } from '../typing-level/level-word';
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
  'typing-story': TypingSentenceScreen,
  'typing-goat': TypingGoatsScreen,
  'game-tandoor-rush': GameLevelOneScreen,
  'game-naan-stack': GameNaanStackScreen,
  'game-fruit-fall': GameLevelFruitScreen,
  'game-flying': GameLevelFlying,
  'game-kite': GameLevelKite,
  'game-ski': GameLevelSki,
  'game-trout': GameLevelTrout,
};
