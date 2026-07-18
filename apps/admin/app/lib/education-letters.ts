/**
 * Uyghur education alphabet used by the game client.
 * Mirrored from utg-prototype `src/utils/example-words.ts` (`EDUCATION_LETTERS`).
 */
export const EDUCATION_LETTERS = [
  'خ',
  'چ',
  'ج',
  'ت',
  'پ',
  'ب',
  'ئە',
  'ئا',
  'ف',
  'غ',
  'ش',
  'س',
  'ژ',
  'ز',
  'ر',
  'د',
  'ھ',
  'ن',
  'م',
  'ل',
  'ڭ',
  'گ',
  'ك',
  'ق',
  'ي',
  'ئى',
  'ئې',
  'ۋ',
  'ئۈ',
  'ئۆ',
  'ئۇ',
  'ئو',
] as const;

export type EducationLetter = (typeof EDUCATION_LETTERS)[number];
