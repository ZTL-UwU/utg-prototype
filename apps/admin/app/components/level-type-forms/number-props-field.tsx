import type { AnyFieldApi } from '@tanstack/react-form';

import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';

export function NumberPropsField({
  field,
  label,
  description,
  min,
  max,
  step = 1,
}: {
  field: AnyFieldApi;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Input
        id={field.name}
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(field.state.value as number) ? (field.state.value as number) : ''}
        onBlur={field.handleBlur}
        // An empty input is stored as NaN so it can be cleared; the Zod schema rejects it on submit.
        onChange={(event) => field.handleChange(event.currentTarget.valueAsNumber)}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
