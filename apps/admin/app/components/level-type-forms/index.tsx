import {
  defaultLevelProps,
  parseLevelProps,
  type LevelTypeId,
  type LevelTypeProps,
} from '@utg/level-types';
import type { ComponentType } from 'react';

import { EducationLetterGridPropsForm } from '~/components/level-type-forms/education-letter-grid';
import { EmptyPropsForm } from '~/components/level-type-forms/empty-props';
import { type LevelPropsFormProps } from '~/components/level-type-forms/shared';
import type { Level } from '~/lib/game';

export { DirtyStateBridge, LEVEL_PROPS_FORM_ID } from '~/components/level-type-forms/shared';

type LevelPropsFormComponent<T extends LevelTypeId> = ComponentType<
  LevelPropsFormProps<LevelTypeProps[T]>
>;

/**
 * Register a props form for each level type here.
 * Adding a type: create the form component, then add one entry.
 */
// TODO: most of these forms are placeholder, should be replaced with the actual forms
const levelTypePropsForms = {
  'education-letter-grid': EducationLetterGridPropsForm,
  'education-bubble': EducationLetterGridPropsForm,
  'education-sheep': EducationLetterGridPropsForm,
  'education-image': EducationLetterGridPropsForm,
  'education-word': EducationLetterGridPropsForm,
  'education-sheep-jump': EducationLetterGridPropsForm,
  'education-whack-a-mole': EducationLetterGridPropsForm,
  'typing-desert': EmptyPropsForm,
  'typing-sandstorm': EmptyPropsForm,
  'typing-instrument': EmptyPropsForm,
  'typing-word': EmptyPropsForm,
  'typing-market': EmptyPropsForm,
  'game-tandoor-rush': EmptyPropsForm,
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
