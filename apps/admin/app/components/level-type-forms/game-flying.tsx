import { useForm } from '@tanstack/react-form';
import { gameFlyingPropsSchema, type GameFlyingProps } from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';
import { WordIdsSelector } from '~/components/word-ids-selector';

export function GameFlyingPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<GameFlyingProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: gameFlyingPropsSchema },
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
              <FieldDescription>Words the bird flies through in this level.</FieldDescription>
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

      <form.Field name="totalWords">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Total words"
            description="Words to complete the level. Leaving this as 0 (or above the number selected) plays every selected word exactly once."
            min={0}
            step={1}
          />
        )}
      </form.Field>
      <form.Field name="jumpHeight">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Jump height"
            description="How far a correct key press lifts the bird (px)."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="maxLives">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Lives"
            description="Starting hearts."
            min={1}
            max={10}
          />
        )}
      </form.Field>
      <form.Field name="invulnerableMs">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Invulnerability (ms)"
            description="Invincibility window after a column hit."
            min={0}
            step={50}
          />
        )}
      </form.Field>
      <form.Field name="columnVelocity">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Column velocity"
            description="How fast columns scroll (pixels per millisecond)."
            min={0.01}
            step={0.01}
          />
        )}
      </form.Field>
      <form.Field name="maxActiveColumns">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Max active columns"
            description="How many columns can be on screen at once."
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
