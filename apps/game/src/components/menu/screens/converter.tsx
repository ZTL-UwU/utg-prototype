import { convertArabic } from '@utg/script-converter';
import { useState } from 'react';
import type { ChangeEvent, TextareaHTMLAttributes } from 'react';

import { BackButton } from '../../ui/BackButton';
import { cn } from '../../ui/utils';

export interface MenuConverterScreenProps {
  onBack: () => void;
}

type ConverterFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
} & Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'dir' | 'lang'>;

function ConverterField({ id, label, value, onChange, readOnly, dir, lang }: ConverterFieldProps) {
  return (
    <label className="flex w-full flex-col gap-2" htmlFor={id}>
      <span className="font-body text-lg font-bold text-forest md:text-xl">{label}</span>
      <textarea
        id={id}
        value={value}
        readOnly={readOnly}
        dir={dir}
        lang={lang}
        rows={3}
        onChange={
          onChange
            ? (event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)
            : undefined
        }
        className={cn(
          'w-full resize-none rounded-2xl border-[3px] border-forest bg-cream px-4 py-3',
          'font-body text-xl text-ink outline-none',
          'focus-visible:ring-4 focus-visible:ring-forest/30',
          readOnly && 'cursor-default',
        )}
      />
    </label>
  );
}

export function MenuConverterScreen({ onBack }: MenuConverterScreenProps) {
  const [arabic, setArabic] = useState('');
  const latin = arabic ? convertArabic(arabic, 'Latin') : '';
  const cyrillic = arabic ? convertArabic(arabic, 'Cyrillic') : '';

  return (
    <>
      <BackButton className="absolute top-4 left-4 z-10" onClick={onBack} />

      <div className="flex min-h-0 w-full flex-1 flex-col justify-center gap-5 py-2 md:gap-6">
        <ConverterField
          id="converter-arabic"
          label="Uyghur Arabic"
          value={arabic}
          onChange={setArabic}
          dir="rtl"
          lang="ug"
        />
        <ConverterField id="converter-latin" label="Latin (ULY)" value={latin} readOnly />
        <ConverterField id="converter-cyrillic" label="Cyrillic" value={cyrillic} readOnly />
      </div>
    </>
  );
}
