import { Field as FieldPrimitive } from '@base-ui/react/field';
import type { ComponentProps } from 'react';

import { cn } from './utils';

function Field({ className, ...props }: FieldPrimitive.Root.Props) {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      className={cn('flex w-full flex-col gap-2', className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: FieldPrimitive.Label.Props) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn('font-body text-lg font-bold text-forest md:text-xl', className)}
      {...props}
    />
  );
}

/** Plain server-side error line (e.g. password mismatch) in the alert tone. */
function FormError({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      role="alert"
      data-slot="form-error"
      className={cn('flex justify-center text-center font-body text-lg text-alert', className)}
      {...props}
    />
  );
}

export { Field, FieldLabel, FormError };
