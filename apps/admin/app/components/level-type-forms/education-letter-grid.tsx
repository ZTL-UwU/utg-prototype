import { useForm } from '@tanstack/react-form';
import { educationLettersPropsSchema, type EducationLettersProps } from '@utg/level-types';

import { EducationLetterSelector } from '~/components/education-letter-selector';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field';

export function EducationLetterGridPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<EducationLettersProps>) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: educationLettersPropsSchema,
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

      <form.Field name="letters" mode="array">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <FieldGroup>
              <div className="flex flex-col gap-1">
                <FieldLabel>Letters</FieldLabel>
              </div>

              <Field data-invalid={isInvalid}>
                <EducationLetterSelector
                  value={field.state.value}
                  onChange={(letters) => {
                    field.setValue(letters);
                    field.handleBlur();
                  }}
                />

                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            </FieldGroup>
          );
        }}
      </form.Field>
    </form>
  );
}
