import { useForm } from '@tanstack/react-form';
import { typingWordsPropsSchema, type TypingWordsProps } from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field';
import { WordIdsSelector } from '~/components/word-ids-selector';

export function TypingMarketPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<TypingWordsProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: typingWordsPropsSchema },
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

      <form.Field name="wordIds" mode="array">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <FieldGroup>
              <FieldLabel>Words</FieldLabel>
              <Field data-invalid={isInvalid}>
                <WordIdsSelector
                  value={field.state.value}
                  onChange={(wordIds) => {
                    field.setValue(wordIds);
                    field.handleBlur();
                  }}
                  requireTargetLetter={false}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            </FieldGroup>
          );
        }}
      </form.Field>

      <form.Field name="roundCount">
        {(field) => <NumberPropsField field={field} label="Round count" min={1} />}
      </form.Field>
    </form>
  );
}
