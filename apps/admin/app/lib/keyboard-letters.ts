/**
 * Uyghur keyboard glyphs used by typing/game levels.
 * Mirrored from game `getAllKeys()` Arabic keys.
 */
export const KEYBOARD_LETTERS = [
  'چ',
  'ۋ',
  'ې',
  'ر',
  'ت',
  'ي',
  'ۇ',
  'ڭ',
  'و',
  'پ',
  'ھ',
  'س',
  'د',
  'ا',
  'ە',
  'ى',
  'ق',
  'ك',
  'ل',
  'ز',
  'ش',
  'غ',
  'ۈ',
  'ب',
  'ن',
  'م',
  'ئ',
  'ژ',
  'ف',
  'گ',
  'خ',
  'ج',
  'ۆ',
  'لا',
] as const;

export type KeyboardLetter = (typeof KEYBOARD_LETTERS)[number];
