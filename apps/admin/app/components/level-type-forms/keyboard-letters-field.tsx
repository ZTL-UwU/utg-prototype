import { KEYBOARD_LETTERS_ARABIC } from '@utg/letters';

import { EducationLetterSelector } from '~/components/education-letter-selector';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';

export function KeyboardLettersField({
  value,
  onChange,
  isInvalid,
  errors,
  description = 'Keyboard letters available as targets in this level.',
}: {
  value: string[];
  onChange: (letters: string[]) => void;
  isInvalid: boolean;
  errors: unknown;
  description?: string;
}) {
  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel>Letters</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <EducationLetterSelector
        value={value}
        onChange={onChange}
        letters={KEYBOARD_LETTERS_ARABIC}
      />
      {isInvalid && <FieldError errors={errors as ({ message?: string } | undefined)[]} />}
    </Field>
  );
}
