import { useForm } from '@tanstack/react-form';
import { educationBubblePropsSchema, type EducationBubbleProps } from '@utg/level-types';

import { EducationLetterSelector } from '~/components/education-letter-selector';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';

export function EducationBubblePropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<EducationBubbleProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: educationBubblePropsSchema },
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
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Letters</FieldLabel>
              <FieldDescription>Letters used in this level.</FieldDescription>
              <EducationLetterSelector
                value={field.state.value}
                onChange={(letters) => {
                  field.setValue(letters);
                  field.handleBlur();
                }}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>
    </form>
  );
}
