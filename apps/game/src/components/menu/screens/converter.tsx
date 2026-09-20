import { convert, type TargetScript } from '@utg/script-converter';
import { useState } from 'react';
import type { ChangeEvent } from 'react';

import { BackButton, Field, FieldLabel, Textarea } from '../../ui';

export interface MenuConverterScreenProps {
  onBack: () => void;
}

type ConverterFieldId = 'arabic' | 'latin' | 'cyrillic';

const FIELD_SCRIPT = {
  arabic: 'Arabic',
  latin: 'Latin',
  cyrillic: 'Cyrillic',
} as const satisfies Record<ConverterFieldId, TargetScript>;

interface ConverterFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: 'rtl' | 'ltr';
  lang?: string;
}

function ConverterField({ id, label, value, onChange, dir, lang }: ConverterFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        value={value}
        dir={dir}
        lang={lang}
        rows={3}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function MenuConverterScreen({ onBack }: MenuConverterScreenProps) {
  const [arabic, setArabic] = useState('');
  const [latin, setLatin] = useState('');
  const [cyrillic, setCyrillic] = useState('');

  const onFieldChange = (field: ConverterFieldId, value: string) => {
    if (!value) {
      setArabic('');
      setLatin('');
      setCyrillic('');
      return;
    }

    const from = FIELD_SCRIPT[field];
    setArabic(field === 'arabic' ? value : convert(value, from, 'Arabic'));
    setLatin(field === 'latin' ? value : convert(value, from, 'Latin'));
    setCyrillic(field === 'cyrillic' ? value : convert(value, from, 'Cyrillic'));
  };

  return (
    <>
      <BackButton className="absolute top-4 left-4 z-10" onClick={onBack} />

      <div className="flex min-h-0 w-full flex-1 flex-col justify-center gap-5 py-2 md:gap-6">
        <ConverterField
          id="converter-arabic"
          label="Uyghur Arabic"
          value={arabic}
          onChange={(value) => onFieldChange('arabic', value)}
          dir="rtl"
          lang="ug"
        />
        <ConverterField
          id="converter-latin"
          label="Latin (ULY)"
          value={latin}
          onChange={(value) => onFieldChange('latin', value)}
        />
        <ConverterField
          id="converter-cyrillic"
          label="Cyrillic"
          value={cyrillic}
          onChange={(value) => onFieldChange('cyrillic', value)}
        />
      </div>
    </>
  );
}
