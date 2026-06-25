import { Assets, HTMLTextStyle } from 'pixi.js';

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

export const EXAMPLE_WORDS = new Map<string, string>([
  ['خ', 'خوراز'],
  ['چ', 'چاينەك'],
  ['ج', 'جان'],
  ['ت', 'تاۋۇز'],
  ['پ', 'پاراخوت '],
  ['ب', 'بولقا'],
  ['ئە', 'ئەينەك'],
  ['ئا', 'ئايروپىلان'],
  ['ف', 'فونتان'],
  ['غ', 'غاز'],
  ['ش', 'شام'],
  ['س', 'سائەت'],
  ['ژ', 'ژۇرنال'],
  ['ز', 'زەنجىر'],
  ['ر', 'رادىئو'],
  ['د', 'دەزمال'],
  ['ھ', 'ھھارۋا'],
  ['ن', 'نان'],
  ['م', 'ماشىنا'],
  ['ل', 'لەگەن'],
  ['ڭ', 'ڭوز'],
  ['گ', 'گىلەم'],
  ['ك', 'كۆلەيكە'],
  ['ق', 'قوغۇن'],
  ['ي', 'يەلپۈگۈچ'],
  ['ئى', 'ئىت'],
  ['ئې', 'ئېيىق'],
  ['ۋ', 'ۋېلوسىپېد'],
  ['ئۈ', 'ئۈزۈم'],
  ['ئۆ', 'ئۆي'],
  // Wrong example?
  // ['ئۇ', 'تۇخۇم'],
  ['ئو', 'ئورغاق'],
]);

export const TYPING_SEQUENCE = new Map<(typeof EDUCATION_LETTERS)[number], readonly string[]>([
  ['خ', ['shift', 'ى']],
  ['چ', ['چ']],
  ['ج', ['shift', 'ق']],
  ['ت', ['ت']],
  ['پ', ['پ']],
  ['ب', ['ب']],
  ['ئە', ['ئ', 'ە']],
  ['ئا', ['ئ', 'ا']],
  ['ف', ['shift', 'ا']],
  ['غ', ['غ']],
  ['ش', ['ش']],
  ['س', ['س']],
  ['ژ', ['shift', 'د']],
  ['ز', ['ز']],
  ['ر', ['ر']],
  ['د', ['د']],
  ['ھ', ['ھ']],
  ['ن', ['ن']],
  ['م', ['م']],
  ['ل', ['ل']],
  ['ڭ', ['ڭ']],
  ['گ', ['shift', 'ە']],
  ['ك', ['ك']],
  ['ق', ['ق']],
  ['ي', ['ي']],
  ['ئى', ['ئ', 'ى']],
  ['ئې', ['ئ', 'ې']],
  ['ۋ', ['ۋ']],
  ['ئۈ', ['ئ', 'ۈ']],
  ['ئۆ', ['ئ', 'shift', 'ك']],
  ['ئۇ', ['ئ', 'ۇ']],
  ['ئو', ['ئ', 'و']],
]);

const WORD_COLORS = {
  BASE_BLUE: 0x1b427a,
  BASE_WHITE: 0xffffff,
  CORRECT: 0x86bd65,
  ACTIVE: 0xffde59,
} as const;

export function createExampleWordStyle(fontSize: number): HTMLTextStyle {
  return new HTMLTextStyle({
    fontSize,
    fill: WORD_COLORS.BASE_BLUE,
    fontFamily: 'Noto Naskh Arabic Bold',
    padding: 40,
    cssOverrides: ['direction: rtl'],
    tagStyles: {
      span: {
        fill: WORD_COLORS.CORRECT,
      },
    },
  });
}

export function createTypingWordStyle(fontSize: number): HTMLTextStyle {
  return new HTMLTextStyle({
    fontSize,
    fill: WORD_COLORS.BASE_WHITE,
    fontFamily: 'Noto Naskh Arabic Bold',
    padding: 40,
    cssOverrides: ['direction: rtl'],
    tagStyles: {
      completed: { fill: WORD_COLORS.CORRECT },
      active: { fill: WORD_COLORS.ACTIVE },
    },
  });
}

export function getCompletedWordMarkup(letter: string, word: string): string {
  return `<span>${letter}</span>${word.slice(letter.length)}`;
}

export function getMissingWordMarkup(letter: string, word: string): string {
  return `_${word.slice(letter.length)}`;
}

export function getHighlightedWordMarkup(word: string, offset: number, length: number): string {
  return (
    `<completed>${word.slice(0, offset)}</completed>` +
    `<active>${word.slice(offset, offset + length)}</active>` +
    word.slice(offset + length)
  );
}

export function hasEducationLetterAudio(letter: string): boolean {
  return (
    Assets.resolver.hasKey(`education-levels/education-letters-audio/${letter}.mp3`) ||
    Assets.resolver.hasKey(`${letter}.mp3`)
  );
}

export function hasEducationLetterImage(letter: string): boolean {
  return Assets.resolver.hasKey(`education-levels/education-letter-images/${letter}.png`);
}

export function getEducationLettersWithAudio(): string[] {
  return EDUCATION_LETTERS.filter(hasEducationLetterAudio);
}

export function getPlayableEducationLetters(): string[] {
  return EDUCATION_LETTERS.filter(
    (letter) => hasEducationLetterAudio(letter) && hasEducationLetterImage(letter),
  );
}

export function pickRandomEducationLetters(count: number): string[] {
  const pool = [...getPlayableEducationLetters()].sort(() => Math.random() - 0.5);
  return pool.slice(0, count);
}

export function getPlayableWords(): [string, string][] {
  return [...EXAMPLE_WORDS.entries()].filter(
    ([letter]) => hasEducationLetterAudio(letter) && hasEducationLetterImage(letter),
  );
}
