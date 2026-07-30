import { useForm } from '@tanstack/react-form';
import { gameTandoorRushPropsSchema, type GameTandoorRushProps } from '@utg/level-types';

import { KeyboardLettersField } from '~/components/level-type-forms/keyboard-letters-field';
import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';

export function GameTandoorRushPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<GameTandoorRushProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: gameTandoorRushPropsSchema },
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
          />
        )}
      </form.Field>

      <form.Field name="targetCount">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Target count"
            description="How many correct hits are needed to finish the level."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="roundDurationMs">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Level duration (ms)"
            description="Time limit for the level in milliseconds."
            min={1000}
            step={1000}
          />
        )}
      </form.Field>
    </form>
  );
}
