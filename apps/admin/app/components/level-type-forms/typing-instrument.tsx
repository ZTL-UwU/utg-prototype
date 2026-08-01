import { useForm } from '@tanstack/react-form';
import { typingInstrumentPropsSchema, type TypingInstrumentProps } from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';

export function TypingInstrumentPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<TypingInstrumentProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: typingInstrumentPropsSchema },
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

      <form.Field name="noteCount">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Note count"
            description="Total notes the player must type."
            min={1}
          />
        )}
      </form.Field>
    </form>
  );
}
