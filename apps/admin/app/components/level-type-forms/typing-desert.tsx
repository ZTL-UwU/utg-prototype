import { useForm } from '@tanstack/react-form';
import { typingDesertPropsSchema, type TypingDesertProps } from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';

export function TypingDesertPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<TypingDesertProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: typingDesertPropsSchema },
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

      <form.Field name="rowSize">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Row size"
            description="Number of letter cards shown in each row."
            min={1}
            max={12}
          />
        )}
      </form.Field>
    </form>
  );
}
