import { useForm } from '@tanstack/react-form';
import { gameFruitFallPropsSchema, type GameFruitFallProps } from '@utg/level-types';

import { KeyboardLettersField } from '~/components/level-type-forms/keyboard-letters-field';
import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';

export function GameFruitFallingPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<GameFruitFallProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: gameFruitFallPropsSchema },
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

      <form.Field name="letters" mode="array">
        {(field) => (
          <KeyboardLettersField
            value={field.state.value}
            onChange={(letters) => {
              field.setValue(letters);
              field.handleBlur();
            }}
            isInvalid={field.state.meta.isTouched && !field.state.meta.isValid}
            errors={field.state.meta.errors}
            description="Keyboard letters that appear on falling fruit."
          />
        )}
      </form.Field>

      <form.Field name="maxActiveFruits">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Max active fruits"
            description="How many fruit can be falling at once."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="minSpawnDelayMs">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Min spawn delay (ms)"
            description="Shortest wait between fruit spawns."
            min={0}
            step={50}
          />
        )}
      </form.Field>
      <form.Field name="maxSpawnDelayMs">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Max spawn delay (ms)"
            description="Longest wait between fruit spawns."
            min={0}
            step={50}
          />
        )}
      </form.Field>
      <form.Field name="fallVelocity">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Fall velocity"
            description="How fast fruit fall (pixels per millisecond)."
            min={0.01}
            step={0.01}
          />
        )}
      </form.Field>
      <form.Field name="totalFruits">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Total Fruits"
            description="Total fruits to complete the level. Leaving this as 0 ensures each selected letter is one fruit"
            min={0}
            step={1}
          />
        )}
      </form.Field>
    </form>
  );
}
