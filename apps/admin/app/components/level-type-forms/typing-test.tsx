import { useForm } from '@tanstack/react-form';
import {
  TYPING_TEST_DURATIONS_SECONDS,
  TYPING_TEST_MODES,
  typingTestPropsSchema,
  type TypingTestDurationSeconds,
  type TypingTestMode,
  type TypingTestProps,
} from '@utg/level-types';

import { KeyboardLettersField } from '~/components/level-type-forms/keyboard-letters-field';
import {
  DirtyStateBridge,
  LEVEL_PROPS_FORM_ID,
  type LevelPropsFormProps,
} from '~/components/level-type-forms/shared';
import { StoryIdSelector } from '~/components/story-id-selector';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Switch } from '~/components/ui/switch';
import { WordIdsSelector } from '~/components/word-ids-selector';

const MODE_LABELS: Record<TypingTestMode, string> = {
  letters: 'Letters',
  words: 'Words',
  sentences: 'Sentences',
};

function durationLabel(seconds: number): string {
  return seconds === 60 ? '1 min' : `${seconds}s`;
}

export function TypingTestPropsForm({
  defaultValues,
  onSubmit,
  onDirtyChange,
}: LevelPropsFormProps<TypingTestProps>) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: typingTestPropsSchema },
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
        {(field) => (
          <KeyboardLettersField
            value={field.state.value}
            onChange={(letters) => {
              field.setValue(letters);
              field.handleBlur();
            }}
            isInvalid={field.state.meta.isTouched && !field.state.meta.isValid}
            errors={field.state.meta.errors}
            description="Letters drawn from in the Letters mode of the test."
          />
        )}
      </form.Field>

      <form.Field name="wordIds" mode="array">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Words</FieldLabel>
              <FieldDescription>Words typed in the Words mode of the test.</FieldDescription>
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
          );
        }}
      </form.Field>

      <form.Field name="storyId">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Story</FieldLabel>
              <FieldDescription>
                Sentences typed in the Sentences mode, in story order.
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

      <form.Field name="defaultMode">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Default mode</FieldLabel>
              <FieldDescription>
                Mode pre-selected in the test settings. Modes without content are hidden.
              </FieldDescription>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value as TypingTestMode)}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={isInvalid}
                  onBlur={field.handleBlur}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TYPING_TEST_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {MODE_LABELS[mode]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>

      <form.Field name="defaultDurationSeconds">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Default duration</FieldLabel>
              <FieldDescription>Duration pre-selected in the test settings.</FieldDescription>
              <Select
                value={String(field.state.value)}
                onValueChange={(value) =>
                  field.handleChange(Number(value) as TypingTestDurationSeconds)
                }
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={isInvalid}
                  onBlur={field.handleBlur}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TYPING_TEST_DURATIONS_SECONDS.map((seconds) => (
                      <SelectItem key={seconds} value={String(seconds)}>
                        {durationLabel(seconds)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>

      <form.Field name="showKeyboardByDefault">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Show keyboard by default</FieldLabel>
              <FieldDescription>
                Whether the on-screen keyboard starts enabled in the test settings.
              </FieldDescription>
              <Switch
                id={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked)}
                onBlur={field.handleBlur}
                aria-invalid={isInvalid}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>
    </form>
  );
}
