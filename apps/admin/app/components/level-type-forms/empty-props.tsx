import { useForm } from '@tanstack/react-form';
import { emptyPropsSchema, type EmptyProps } from '@utg/level-types';

import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { FieldDescription } from '~/components/ui/field';

export function EmptyPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<EmptyProps>) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: emptyPropsSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(value);
    },
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

      <FieldDescription>This level type has no configurable parameters.</FieldDescription>
    </form>
  );
}
