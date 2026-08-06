import { useForm } from '@tanstack/react-form';
import { gameSkiPropsSchema, type GameSkiProps } from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { SentenceIdsSelector } from '~/components/sentence-ids-selector';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';

export function GameSkiPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<GameSkiProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: gameSkiPropsSchema },
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

      <form.Field name="sentenceIds" mode="array">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Sentences</FieldLabel>
              <FieldDescription>
                Sentences typed at each barrier during the ski race.
              </FieldDescription>
              <SentenceIdsSelector
                value={field.state.value}
                onChange={(sentenceIds) => {
                  field.setValue(sentenceIds);
                  field.handleBlur();
                }}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>

      <form.Field name="roundCount">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Barriers"
            description="How many sentences / barriers appear in the race (spec default is 5)."
            min={1}
          />
        )}
      </form.Field>

      <form.Field name="maxLives">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Lives"
            description="Starting hearts. Mistakes and missed barriers cost a heart."
            min={1}
            max={10}
          />
        )}
      </form.Field>

      <form.Field name="approachDurationMs">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Approach duration (ms)"
            description="Time to type each sentence before the barrier arrives."
            min={3000}
            step={500}
          />
        )}
      </form.Field>

      <form.Field name="countdownStepMs">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Countdown step (ms)"
            description="Duration of each Ready / Set / Go beat at the start gate."
            min={300}
            step={50}
          />
        )}
      </form.Field>

      <form.Field name="sentenceFontSize">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Sentence font size"
            description="Pixel size of the on-screen sentence."
            min={1}
          />
        )}
      </form.Field>
    </form>
  );
}
