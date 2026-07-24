import { EducationLetterSelector } from '~/components/education-letter-selector';
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field';
import { KEYBOARD_LETTERS } from '~/lib/keyboard-letters';

export function KeyboardLettersField({
  value,
  onChange,
  isInvalid,
  errors,
}: {
  value: string[];
  onChange: (letters: string[]) => void;
  isInvalid: boolean;
  errors: unknown;
}) {
  return (
    <FieldGroup>
      <FieldLabel>Letters</FieldLabel>
      <Field data-invalid={isInvalid}>
        <EducationLetterSelector value={value} onChange={onChange} letters={KEYBOARD_LETTERS} />
        {isInvalid && <FieldError errors={errors as ({ message?: string } | undefined)[]} />}
      </Field>
    </FieldGroup>
  );
}
