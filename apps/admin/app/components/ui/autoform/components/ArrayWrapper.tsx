import type { ArrayWrapperProps } from '@autoform/react';
import { PlusIcon } from 'lucide-react';
import React from 'react';

import { Button } from '~/components/ui/button';

export const ArrayWrapper: React.FC<ArrayWrapperProps> = ({
  label,
  error,
  children,
  onAddItem,
  inputProps,
  parsedField,
}) => {
  const { key, ref, 'aria-invalid': ariaInvalid, ...props } = inputProps;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <h3
          className={`text-md font-medium focus:outline-none rounded-md px-2 py-1 transition-colors ${
            error
              ? 'focus:border focus:border-destructive focus:ring-1 focus:ring-destructive/50'
              : ''
          }`}
          ref={ref}
          tabIndex={-1}
          aria-invalid={ariaInvalid}
          aria-describedby={`${key}-error ${key}-description`}
        >
          {label}
          {parsedField.required && <span className="text-destructive"> *</span>}
        </h3>
        {parsedField.fieldConfig?.description && (
          <div className="text-sm text-muted-foreground" id={key + '-description'}>
            {parsedField.fieldConfig.description}
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive" id={key + '-error'}>
            {error}
          </div>
        )}
      </div>
      {children}
      <Button
        {...props}
        size="sm"
        type="button"
        variant="outline"
        onClick={(e) => {
          e.currentTarget.blur();
          onAddItem();
        }}
        aria-label={
          typeof label === 'string' || typeof label === 'number'
            ? `add ${label}`
            : `add ${parsedField.key}`
        }
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};
