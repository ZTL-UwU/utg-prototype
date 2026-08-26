import { useForm } from '@tanstack/react-form';
import { typingGoatsPropsSchema, type TypingGoatsProps } from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { StoryIdSelector } from '~/components/story-id-selector';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';

export function TypingGoatPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<TypingGoatsProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: typingGoatsPropsSchema },
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

      <form.Field name="storyId">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Story</FieldLabel>
              <FieldDescription>
                Every sentence in this story is played in story order.
              </FieldDescription>
              <StoryIdSelector
                value={field.state.value}
                onChange={(storyId) => {
                  field.setValue(storyId);
                  field.handleBlur();
                }}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>

      <form.Field name="sentenceDurationMs">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Sentence duration (ms)"
            description="Time limit for each sentence in milliseconds."
            min={1000}
            step={1000}
          />
        )}
      </form.Field>
    </form>
  );
}
