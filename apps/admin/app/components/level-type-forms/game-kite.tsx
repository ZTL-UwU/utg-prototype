import { useForm } from '@tanstack/react-form';
import { gameKitePropsSchema, type GameKiteProps } from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';
import { WordIdsSelector } from '~/components/word-ids-selector';

export function GameKitePropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<GameKiteProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: gameKitePropsSchema },
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
              <FieldDescription>Words the gusts carry in this level.</FieldDescription>
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

      <form.Field name="maxLives">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Lives"
            description="Starting kites."
            min={1}
            max={10}
          />
        )}
      </form.Field>
      <form.Field name="gustDurationSeconds">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Gust duration (seconds)"
            description="How long a word stays up before the gust blows away and costs a life."
            min={5}
          />
        )}
      </form.Field>
      <form.Field name="pointsOnLetter">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Points per letter"
            description="Score awarded for each correct key press."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="pointsOnWord">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Points per word"
            description="Bonus score awarded for completing a word."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="wordFontSize">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Word font size"
            description="Pixel size of the on-screen word."
            min={1}
          />
        )}
      </form.Field>
    </form>
  );
}
