/** Uyghur education alphabet used by the game client and admin tools. */
export const EDUCATION_LETTERS = [
  'ئا',
  'ئە',
  'ب',
  'پ',
  'ت',
  'ج',
  'چ',
  'خ',
  'د',
  'ر',
  'ز',
  'ژ',
  'س',
  'ش',
  'غ',
  'ف',
  'ق',
  'ك',
  'گ',
  'ڭ',
  'ل',
  'م',
  'ن',
  'ھ',
  'ئو',
  'ئۇ',
  'ئۆ',
  'ئۈ',
  'ۋ',
  'ئې',
  'ئى',
  'ي',
] as const;

export type EducationLetter = (typeof EDUCATION_LETTERS)[number];

/** Physical key sequence required to type each education letter on the Arabic keyboard. */
export const TYPING_SEQUENCE_ARABIC = new Map<EducationLetter, readonly string[]>([
  ['ئا', ['ئ', 'ا']],
  ['ئە', ['ئ', 'ە']],
  ['ب', ['ب']],
  ['پ', ['پ']],
  ['ت', ['ت']],
  ['ج', ['shift', 'ق']],
  ['چ', ['چ']],
  ['خ', ['shift', 'ى']],
  ['د', ['د']],
  ['ر', ['ر']],
  ['ز', ['ز']],
  ['ژ', ['shift', 'د']],
  ['س', ['س']],
  ['ش', ['ش']],
  ['غ', ['غ']],
  ['ف', ['shift', 'ا']],
  ['ق', ['ق']],
  ['ك', ['ك']],
  ['گ', ['shift', 'ە']],
  ['ڭ', ['ڭ']],
  ['ل', ['ل']],
  ['م', ['م']],
  ['ن', ['ن']],
  ['ھ', ['ھ']],
  ['ئو', ['ئ', 'و']],
  ['ئۇ', ['ئ', 'ۇ']],
  ['ئۆ', ['ئ', 'shift', 'ك']],
  ['ئۈ', ['ئ', 'ۈ']],
  ['ۋ', ['ۋ']],
  ['ئې', ['ئ', 'ې']],
  ['ئى', ['ئ', 'ى']],
  ['ي', ['ي']],
]);

/**
 * Physical key sequence required to type each education letter on the Latin (ULY) keyboard.
 * Digraphs are separate base letters; é / ö / ü are dedicated unshifted keys.
 */
export const TYPING_SEQUENCE_LATIN = new Map<EducationLetter, readonly string[]>([
  ['ئا', ['a']],
  ['ئە', ['e']],
  ['ب', ['b']],
  ['پ', ['p']],
  ['ت', ['t']],
  ['ج', ['j']],
  ['چ', ['c', 'h']],
  ['خ', ['x']],
  ['د', ['d']],
  ['ر', ['r']],
  ['ز', ['z']],
  ['ژ', ['z', 'h']],
  ['س', ['s']],
  ['ش', ['s', 'h']],
  ['غ', ['g', 'h']],
  ['ف', ['f']],
  ['ق', ['q']],
  ['ك', ['k']],
  ['گ', ['g']],
  ['ڭ', ['n', 'g']],
  ['ل', ['l']],
  ['م', ['m']],
  ['ن', ['n']],
  ['ھ', ['h']],
  ['ئو', ['o']],
  ['ئۇ', ['u']],
  ['ئۆ', ['ö']],
  ['ئۈ', ['ü']],
  ['ۋ', ['w']],
  ['ئې', ['é']],
  ['ئى', ['i']],
  ['ي', ['y']],
]);

/**
 * Physical key sequence required to type each education letter on the Cyrillic keyboard.
 * Layout mirrors Arabic key positions (phonetic); no hamza prefix.
 */
export const TYPING_SEQUENCE_CYRILLIC = new Map<EducationLetter, readonly string[]>([
  ['ئا', ['а']],
  ['ئە', ['ә']],
  ['ب', ['б']],
  ['پ', ['п']],
  ['ت', ['т']],
  ['ج', ['shift', 'қ']],
  ['چ', ['ч']],
  ['خ', ['shift', 'и']],
  ['د', ['д']],
  ['ر', ['р']],
  ['ز', ['з']],
  ['ژ', ['shift', 'д']],
  ['س', ['с']],
  ['ش', ['ш']],
  ['غ', ['ғ']],
  ['ف', ['shift', 'а']],
  ['ق', ['қ']],
  ['ك', ['к']],
  ['گ', ['shift', 'ә']],
  ['ڭ', ['ң']],
  ['ل', ['л']],
  ['م', ['м']],
  ['ن', ['н']],
  ['ھ', ['һ']],
  ['ئو', ['о']],
  ['ئۇ', ['у']],
  ['ئۆ', ['shift', 'к']],
  ['ئۈ', ['ү']],
  ['ۋ', ['в']],
  ['ئې', ['е']],
  ['ئى', ['и']],
  ['ي', ['й']],
]);

/** Aliases Arabic sequences; prefer {@link getTypingSequenceForScript}. */
export const TYPING_SEQUENCE = TYPING_SEQUENCE_ARABIC;

/** Uyghur keyboard letter pool for typing-level configuration. */
export const KEYBOARD_LETTERS_ARABIC = [
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

/** Uyghur Latin Script (ULS) keyboard letter pool for typing-level configuration. */
export const KEYBOARD_LETTERS_LATIN = [
  'c',
  'h',
  'w',
  'é',
  'r',
  't',
  'y',
  'u',
  'n',
  'g',
  'o',
  'p',
  's',
  'd',
  'a',
  'e',
  'i',
  'q',
  'k',
  'l',
  'z',
  'ü',
  'b',
  'm',
  'f',
  'x',
  'j',
  'ö',
] as const;

/** Uyghur Cyrillic Script (UCS) keyboard letter pool for typing-level configuration. */
export const KEYBOARD_LETTERS_CYRILLIC = [
  'ч',
  'в',
  'е',
  'р',
  'т',
  'й',
  'у',
  'ң',
  'о',
  'п',
  'һ',
  'с',
  'д',
  'а',
  'ә',
  'и',
  'қ',
  'к',
  'л',
  'з',
  'ш',
  'ғ',
  'ү',
  'б',
  'н',
  'м',
  'ж',
  'ф',
  'г',
  'х',
  'җ',
  'ө',
] as const;

export type KeyboardScript = 'Arabic' | 'Latin' | 'Cyrillic';

/** Full keyboard letter pool for the given orthography. */
export function getKeyboardLettersForScript(script: KeyboardScript): readonly string[] {
  switch (script) {
    case 'Latin':
      return KEYBOARD_LETTERS_LATIN;
    case 'Cyrillic':
      return KEYBOARD_LETTERS_CYRILLIC;
    default:
      return KEYBOARD_LETTERS_ARABIC;
  }
}

/** Typing key sequence map for the given orthography. */
export function getTypingSequenceForScript(
  script: KeyboardScript,
): Map<EducationLetter, readonly string[]> {
  switch (script) {
    case 'Latin':
      return TYPING_SEQUENCE_LATIN;
    case 'Cyrillic':
      return TYPING_SEQUENCE_CYRILLIC;
    default:
      return TYPING_SEQUENCE_ARABIC;
  }
}
