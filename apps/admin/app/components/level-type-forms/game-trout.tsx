import { useForm } from '@tanstack/react-form';
import { gameTroutPropsSchema, type GameTroutProps } from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';
import { WordIdsSelector } from '~/components/word-ids-selector';

export function GameTroutPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<GameTroutProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: gameTroutPropsSchema },
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
                Words shown on trout bubbles each round. Concurrent words always use different
                starting letters (after script conversion).
              </FieldDescription>
              <WordIdsSelector
                value={field.state.value}
                onChange={(wordIds) => {
                  field.setValue(wordIds);
                  field.handleBlur();
                }}
                requireTargetLetter={false}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>

      <form.Field name="maxActiveTrout">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Max active trout"
            description="How many fish (and words) can appear in the river at once."
            min={1}
            max={8}
          />
        )}
      </form.Field>
      <form.Field name="wordDurationMs">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Word duration (ms)"
            description="Time limit for the active word, shown on the progress bar."
            min={1000}
            step={100}
          />
        )}
      </form.Field>
      <form.Field name="totalCatches">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Total catches"
            description="Successful word catches needed to finish the level."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="wordFontSize">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Word font size"
            description="Pixel size of the word inside each bubble."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="swimSpeedPxPerSecond">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Swim speed"
            description="How fast trout drift while swimming (px/s)."
            min={1}
          />
        )}
      </form.Field>
    </form>
  );
}
