import { useForm } from '@tanstack/react-form';
import {
  gameWordSearchPropsSchema,
  WORD_SEARCH_GRID_SIZE,
  WORD_SEARCH_MAX_WORDS,
  WORD_SEARCH_MIN_WORDS,
  type GameWordSearchProps,
} from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';
import { WordIdsSelector } from '~/components/word-ids-selector';

export function GameWordSearchPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<GameWordSearchProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: gameWordSearchPropsSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <form
      id={LEVEL_PROPS_FORM_ID}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe
        selector={(state) => !state.isDefaultValue}
        children={(dirty) => <DirtyStateBridge dirty={dirty} onDirtyChange={onDirtyChange} />}
      />

      <form.Field name="wordIds" mode="array">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Words</FieldLabel>
              <FieldDescription>
                Pool of words to hide. Each play picks a random set from these, so select as many as
                you like. Only single words of up to {WORD_SEARCH_GRID_SIZE} letters are listed.
              </FieldDescription>
              <WordIdsSelector
                value={field.state.value}
                onChange={(wordIds) => {
                  field.setValue(wordIds);
                  field.handleBlur();
                }}
                requireTargetLetter={false}
                maxLength={WORD_SEARCH_GRID_SIZE}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>

      <form.Field name="wordCount">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Words per game"
            description={`Words hidden in each ${WORD_SEARCH_GRID_SIZE}×${WORD_SEARCH_GRID_SIZE} grid (${WORD_SEARCH_MIN_WORDS}–${WORD_SEARCH_MAX_WORDS}). Around 10 fills about half the grid.`}
            min={WORD_SEARCH_MIN_WORDS}
            max={WORD_SEARCH_MAX_WORDS}
          />
        )}
      </form.Field>
    </form>
  );
}
