import { EDUCATION_LETTERS } from '@utg/letters';
import { convertArabic } from '@utg/script-converter';

import { BackButton } from '../../ui/BackButton';
import { cn } from '../../ui/utils';

export interface MenuAlphabetScreenProps {
  onBack: () => void;
}

type AlphabetEntry = {
  arabic: string;
  latin: string;
  cyrillic: string;
  ipa: string;
};

/** IPA for each education letter, in {@link EDUCATION_LETTERS} order. */
const IPA_BY_LETTER: Record<(typeof EDUCATION_LETTERS)[number], string> = {
  ئا: '/ɑ/',
  ئە: '/ɛ/ ~ /æ/',
  ب: '/b/',
  پ: '/p/',
  ت: '/t/',
  ج: '/dʒ/',
  چ: '/tʃ/',
  خ: '/χ/',
  د: '/d/',
  ر: '/r/',
  ز: '/z/',
  ژ: '/ʒ/',
  س: '/s/',
  ش: '/ʃ/',
  غ: '/ʁ/',
  ف: '/f/',
  ق: '/q/',
  ك: '/k/',
  گ: '/ɡ/',
  ڭ: '/ŋ/',
  ل: '/l/',
  م: '/m/',
  ن: '/n/',
  ھ: '/h/',
  ئو: '/o/',
  ئۇ: '/u/',
  ئۆ: '/ø/',
  ئۈ: '/y/',
  ۋ: '/v/ ~ /w/',
  ئې: '/e/',
  ئى: '/ɪ/ ~ /i/',
  ي: '/j/',
};

const ALPHABET_ENTRIES: AlphabetEntry[] = EDUCATION_LETTERS.map((arabic) => ({
  arabic,
  latin: convertArabic(arabic, 'Latin').toLocaleLowerCase('ug'),
  cyrillic: convertArabic(arabic, 'Cyrillic').toLocaleLowerCase('ug'),
  ipa: IPA_BY_LETTER[arabic],
}));

/** Traditional two-column layout: even indices left, odd indices right. */
const LEFT_COLUMN = ALPHABET_ENTRIES.filter((_, i) => i % 2 === 0);
const RIGHT_COLUMN = ALPHABET_ENTRIES.filter((_, i) => i % 2 === 1);

const HEADERS = ['Arabic', 'Latin', 'Cyrillic', 'IPA'] as const;

function AlphabetTable({ rows }: { rows: AlphabetEntry[] }) {
  return (
    <table className="w-full border-collapse text-center">
      <thead>
        <tr>
          {HEADERS.map((header) => (
            <th
              key={header}
              className="pb-2 font-body text-sm font-bold tracking-wide text-ink md:text-base"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.arabic} className="border-t border-ink/10">
            <td
              className="py-1.5 font-body text-lg text-ink md:py-2 md:text-xl"
              lang="ug"
              dir="rtl"
            >
              {row.arabic}
            </td>
            <td className="py-1.5 font-body text-base text-ink md:py-2 md:text-lg">{row.latin}</td>
            <td className="py-1.5 font-body text-base text-ink md:py-2 md:text-lg">
              {row.cyrillic}
            </td>
            <td className="py-1.5 md:py-2">
              <span
                className={cn(
                  'inline-block rounded-pill border border-ink/15 bg-ink/5',
                  'px-2.5 py-0.5 font-body text-xs text-ink/80 md:text-sm',
                )}
              >
                {row.ipa}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MenuAlphabetScreen({ onBack }: MenuAlphabetScreenProps) {
  return (
    <>
      <BackButton className="absolute top-4 left-4 z-10" onClick={onBack} />

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <div className="grid grid-cols-2 gap-4 md:gap-10">
          <AlphabetTable rows={LEFT_COLUMN} />
          <AlphabetTable rows={RIGHT_COLUMN} />
        </div>
      </div>
    </>
  );
}
