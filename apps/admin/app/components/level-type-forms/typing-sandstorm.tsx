import { useForm } from '@tanstack/react-form';
import { typingSandstormPropsSchema, type TypingSandstormProps } from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';

export function TypingSandstormPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<TypingSandstormProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: typingSandstormPropsSchema },
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

      <form.Field name="letterGoal">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Letter goal"
            description="How many letters must be typed to finish the level."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="maxActiveLetters">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Max active letters"
            description="Maximum number of letters falling at the same time."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="minSpawnDelayMs">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Min spawn delay (ms)"
            description="Shortest wait between letter spawns."
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
            description="Longest wait between letter spawns."
            min={0}
            step={50}
          />
        )}
      </form.Field>
      <form.Field name="fallSpeedMin">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Fall speed min"
            description="Slowest fall speed for letters."
            min={1}
          />
        )}
      </form.Field>
      <form.Field name="fallSpeedMax">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Fall speed max"
            description="Fastest fall speed for letters."
            min={1}
          />
        )}
      </form.Field>
    </form>
  );
}
