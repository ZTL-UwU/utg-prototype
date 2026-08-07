import { useForm } from '@tanstack/react-form';
import { typingStoryPropsSchema, type TypingStoryProps } from '@utg/level-types';

import { NumberPropsField } from '~/components/level-type-forms/number-props-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { StoryIdSelector } from '~/components/story-id-selector';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';

export function TypingStoryPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<TypingStoryProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: typingStoryPropsSchema },
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
              <FieldDescription>Story whose sentences are used in this level.</FieldDescription>
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

      <form.Field name="roundCount">
        {(field) => (
          <NumberPropsField
            field={field}
            label="Round count"
            description="Number of sentences played in this level."
            min={1}
          />
        )}
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
