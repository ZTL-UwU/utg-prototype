'use client';

import type {
  AutoFormUIComponents,
  AutoFormProps as BaseAutoFormProps,
  ExtendableAutoFormProps,
} from '@autoform/react';
import { AutoForm as TanStackAutoForm } from '@autoform/react/tanstack-form';

import { ArrayElementWrapper } from './components/ArrayElementWrapper';
import { ArrayWrapper } from './components/ArrayWrapper';
import { ErrorMessage } from './components/ErrorMessage';
import { FieldWrapper } from './components/FieldWrapper';
import { Form } from './components/Form';
import { ObjectWrapper } from './components/ObjectWrapper';
import { SubmitButton } from './components/SubmitButton';
import { BooleanField } from './components/tanstack/BooleanField';
import { DateField } from './components/tanstack/DateField';
import { NumberField } from './components/tanstack/NumberField';
import { SelectField } from './components/tanstack/SelectField';
import { StringField } from './components/tanstack/StringField';

export type FieldTypes = 'string' | 'number' | 'boolean' | 'date' | 'select';
export type { ExtendableAutoFormProps as AutoFormProps } from '@autoform/react';

const UIComponents: AutoFormUIComponents = {
  Form,
  FieldWrapper,
  ErrorMessage,
  SubmitButton,
  ObjectWrapper,
  ArrayWrapper,
  ArrayElementWrapper,
};

const TanStackFieldComponents = {
  string: StringField,
  number: NumberField,
  boolean: BooleanField,
  date: DateField,
  select: SelectField,
} as const;

export function AutoForm<T extends Record<string, any> = Record<string, any>>({
  uiComponents,
  formComponents,
  ...props
}: ExtendableAutoFormProps<T>) {
  return (
    <TanStackAutoForm
      {...(props as BaseAutoFormProps<T>)}
      uiComponents={{ ...UIComponents, ...uiComponents }}
      formComponents={{ ...TanStackFieldComponents, ...formComponents }}
    />
  );
}
