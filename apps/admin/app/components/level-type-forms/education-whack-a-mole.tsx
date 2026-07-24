import { useForm } from '@tanstack/react-form';
import { educationWhackAMolePropsSchema, type EducationWhackAMoleProps } from '@utg/level-types';

import { EducationLetterSelector } from '~/components/education-letter-selector';
import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field';

export function EducationWhackAMolePropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<EducationWhackAMoleProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: educationWhackAMolePropsSchema },
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
            <FieldGroup>
              <FieldLabel>Letters</FieldLabel>
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

      <form.Field name="moleTurnDelayMs">
        {(field) => (
          <NumberPropsField field={field} label="Mole turn delay (ms)" min={1} step={50} />
        )}
      </form.Field>

      <form.Field name="initialMoleDelayMs">
        {(field) => (
          <NumberPropsField field={field} label="Initial mole delay (ms)" min={1} step={50} />
        )}
      </form.Field>
    </form>
  );
}
