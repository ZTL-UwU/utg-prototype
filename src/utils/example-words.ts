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
  ['ت', 'تاۋۇز '],
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

const WORD_COLORS = {
  BASE: 0x1b427a,
  HIGHLIGHT: 0x86bd65,
} as const;

export function createExampleWordStyle(fontSize: number): HTMLTextStyle {
  return new HTMLTextStyle({
    fontSize,
    fill: WORD_COLORS.BASE,
    fontFamily: 'Noto Naskh Arabic Bold',
    padding: 40,
    cssOverrides: ['direction: rtl'],
    tagStyles: {
      span: {
        fill: WORD_COLORS.HIGHLIGHT,
      },
    },
  });
}

export function getCompletedWordMarkup(letter: string, word: string): string {
  return `<span>${letter}</span>${word.slice(letter.length)}`;
}

export function getMissingWordMarkup(letter: string, word: string): string {
  return `_${word.slice(letter.length)}`;
}

export function getPlayableWords(): [string, string][] {
  return [...EXAMPLE_WORDS.entries()].filter(
    ([letter]) =>
      Assets.resolver.hasKey(`${letter}.mp3`) &&
      Assets.resolver.hasKey(`education-letter-images/${letter}.png`),
  );
}
