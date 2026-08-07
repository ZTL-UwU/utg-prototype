import {
  defaultLevelProps,
  parseLevelProps,
  type LevelTypeId,
  type LevelTypeProps,
} from '@utg/level-types';
import type { ComponentType } from 'react';

import { EducationBubblePropsForm } from '~/components/level-type-forms/education-bubble';
import { EducationImagePropsForm } from '~/components/level-type-forms/education-image';
import { EducationLetterGridPropsForm } from '~/components/level-type-forms/education-letter-grid';
import { EducationSheepPropsForm } from '~/components/level-type-forms/education-sheep';
import { EducationSheepJumpPropsForm } from '~/components/level-type-forms/education-sheep-jump';
import { EducationWhackAMolePropsForm } from '~/components/level-type-forms/education-whack-a-mole';
import { EducationWordPropsForm } from '~/components/level-type-forms/education-word';
import { GameFlyingPropsForm } from '~/components/level-type-forms/game-flying';
import { GameFruitFallingPropsForm } from '~/components/level-type-forms/game-fruit-falling';
import { GameKitePropsForm } from '~/components/level-type-forms/game-kite';
import { GameNaanStackPropsForm } from '~/components/level-type-forms/game-naan-stack';
import { GameSkiPropsForm } from '~/components/level-type-forms/game-ski';
import { GameTandoorRushPropsForm } from '~/components/level-type-forms/game-tandoor-rush';
import { GameTroutPropsForm } from '~/components/level-type-forms/game-trout';
import { type LevelPropsFormProps } from '~/components/level-type-forms/shared';
import { TypingDesertPropsForm } from '~/components/level-type-forms/typing-desert';
import { TypingInstrumentPropsForm } from '~/components/level-type-forms/typing-instrument';
import { TypingMarketPropsForm } from '~/components/level-type-forms/typing-market';
import { TypingSandstormPropsForm } from '~/components/level-type-forms/typing-sandstorm';
import { TypingStoryPropsForm } from '~/components/level-type-forms/typing-story';
import { TypingWordPropsForm } from '~/components/level-type-forms/typing-word';
import type { Level } from '~/lib/game';

export { DirtyStateBridge, LEVEL_PROPS_FORM_ID } from '~/components/level-type-forms/shared';

type LevelPropsFormComponent<T extends LevelTypeId> = ComponentType<
  LevelPropsFormProps<LevelTypeProps[T]>
>;

/**
 * Register a props form for each level type here.
 * Adding a type: create the form component, then add one entry.
 */
const levelTypePropsForms = {
  'education-letter-grid': EducationLetterGridPropsForm,
  'education-bubble': EducationBubblePropsForm,
  'education-sheep': EducationSheepPropsForm,
  'education-image': EducationImagePropsForm,
  'education-word': EducationWordPropsForm,
  'education-sheep-jump': EducationSheepJumpPropsForm,
  'education-whack-a-mole': EducationWhackAMolePropsForm,
  'typing-desert': TypingDesertPropsForm,
  'typing-sandstorm': TypingSandstormPropsForm,
  'typing-instrument': TypingInstrumentPropsForm,
  'typing-word': TypingWordPropsForm,
  'typing-market': TypingMarketPropsForm,
  'typing-story': TypingStoryPropsForm,
  'game-tandoor-rush': GameTandoorRushPropsForm,
  'game-fruit-fall': GameFruitFallingPropsForm,
  'game-naan-stack': GameNaanStackPropsForm,
  'game-flying': GameFlyingPropsForm,
  'game-kite': GameKitePropsForm,
  'game-ski': GameSkiPropsForm,
  'game-trout': GameTroutPropsForm,
} satisfies { [K in LevelTypeId]: LevelPropsFormComponent<K> };

function resolveDefaultProps(level: Level | null, levelType: LevelTypeId) {
  if (level?.level_type === levelType) {
    return parseLevelProps(levelType, level.level_props);
  }
  return defaultLevelProps(levelType);
}

export function LevelPropsFields({
  level,
  levelType,
  onSubmit,
  onDirtyChange,
}: {
  level: Level | null;
  levelType: LevelTypeId;
  onSubmit: (levelProps: unknown) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const Form = levelTypePropsForms[levelType] as LevelPropsFormComponent<LevelTypeId>;

  return (
    <Form
      defaultValues={resolveDefaultProps(level, levelType)}
      onDirtyChange={onDirtyChange}
      onSubmit={onSubmit}
    />
  );
}
