import { useForm } from '@tanstack/react-form';
import { gameNaanStackPropsSchema, type GameNaanStackProps } from '@utg/level-types';

import { KeyboardLettersField } from '~/components/level-type-forms/keyboard-letters-field';
import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';

export function GameNaanStackPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<GameNaanStackProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: gameNaanStackPropsSchema },
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
            description="Keyboard letters that appear on moving naan."
          />
        )}
      </form.Field>

      <form.Field name="plateCapacity">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Plate capacity"
            description="How many naan fill a plate. The level ends when both plates are full."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="maxLives">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Lives"
            description="Hearts lost when a naan leaves the screen."
            min={1}
            max={10}
          />
        )}
      </form.Field>
      <form.Field name="spawnDelayMs">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Spawn delay (ms)"
            description="Wait between naan spawns."
            min={0}
            step={50}
          />
        )}
      </form.Field>
      <form.Field name="moveSpeed">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Move speed"
            description="Horizontal speed for naan (px/s)."
            min={1}
          />
        )}
      </form.Field>
    </form>
  );
}
