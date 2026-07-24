import type { AnyFieldApi } from '@tanstack/react-form';

import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';

export function NumberPropsField({
  field,
  label,
  min,
  max,
  step = 1,
}: {
  field: AnyFieldApi;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldGroup>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Field data-invalid={isInvalid}>
        <Input
          id={field.name}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(field.state.value as number) ? (field.state.value as number) : ''}
          onBlur={field.handleBlur}
          onChange={(event) => {
            const next = event.currentTarget.valueAsNumber;
            field.handleChange(Number.isNaN(next) ? field.state.value : next);
          }}
        />
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </Field>
    </FieldGroup>
  );
}
