import type { AutoFormFieldProps } from '@autoform/react';
import { useFieldContext } from '@autoform/react/tanstack-form';
import React from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

export const SelectField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  parsedField,
}) => {
  const field = useFieldContext<string>();
  const { ref, 'aria-invalid': ariaInvalid, ...restInputProps } = inputProps as any;

  return (
    <Select
      onValueChange={(val) => field.handleChange(typeof val === 'string' ? val : '')}
      value={field.state.value ?? ''}
      name={field.name}
      {...restInputProps}
    >
      <SelectTrigger
        id={id}
        ref={ref}
        aria-invalid={ariaInvalid}
        onBlur={field.handleBlur}
        className={error ? 'border-destructive' : ''}
      >
        <SelectValue placeholder={inputProps?.placeholder ?? 'Select an option'} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {(parsedField.options || []).map(([key, label], index) => (
            <SelectItem key={`${key}-${index}`} value={label}>
              {label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
