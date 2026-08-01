/**
 * Uyghur Arabic (UAS) → Latin (ULS) / Cyrillic (UCS) converter.
 *
 * Ported from https://github.com/neouyghur/Uyghur-Multi-Script-Converter
 * (Apache-2.0), keeping only Arabic→Latin and Arabic→Cyrillic.
 */

const UAS_CHARS = [
  'ا',
  'ە',
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
  'ف',
  'ڭ',
  'ل',
  'لا',
  'م',
  'ھ',
  'و',
  'ۇ',
  'ۆ',
  'ۈ',
  'ۋ',
  'ې',
  'ى',
  'ي',
  'ق',
  'ك',
  'گ',
  'ن',
  'غ',
  '؟',
  '،',
  '؛',
  '٭',
] as const;

const CTS_CHARS = [
  'a',
  'e',
  'b',
  'p',
  't',
  'c',
  'ç',
  'x',
  'd',
  'r',
  'z',
  'j',
  's',
  'ş',
  'f',
  'ñ',
  'l',
  'la',
  'm',
  'h',
  'o',
  'u',
  'ö',
  'ü',
  'v',
  'é',
  'i',
  'y',
  'q',
  'k',
  'g',
  'n',
  'ğ',
  '?',
  ',',
  ';',
  '*',
] as const;

const UCS_CHARS = [
  'а',
  'ә',
  'б',
  'п',
  'т',
  'җ',
  'ч',
  'х',
  'д',
  'р',
  'з',
  'ж',
  'с',
  'ш',
  'ф',
  'ң',
  'л',
  'ла',
  'м',
  'һ',
  'о',
  'у',
  'ө',
  'ү',
  'в',
  'е',
  'и',
  'й',
  'қ',
  'к',
  'г',
  'н',
  'ғ',
  '?',
  ',',
  ';',
  '*',
] as const;

/** Hamza (ئ) removed at word start / after non-CTS letters; otherwise becomes `'`. */
const LEADING_HAMZA = /(?<=[^aeuoöübptcçxdzrjsşfñlmhvéiyqkgnğ]|^)\u0626/gu;

function replaceViaTable(text: string, from: readonly string[], to: readonly string[]): string {
  let result = text;
  for (let i = 0; i < from.length; i++) {
    result = result.replaceAll(from[i]!, to[i]!);
  }
  return result;
}

/**
 * After UAS→CTS letter mapping, normalize remaining hamza (ئ).
 * When `keepApostrophes` is true (UAS→ULS/UCS), medial hamza becomes `'`.
 */
function reviseCts(text: string): string {
  let result = text.replace(LEADING_HAMZA, '');
  result = result.replace(/([aeéiouöü])\u0626/gu, '$1');
  return result.replaceAll('\u0626', "'");
}

/** Common Turkic Script digraphs → Uyghur Latin Script. */
function ctsToUls(text: string): string {
  return text
    .replaceAll('ng', "n'g")
    .replaceAll('sh', "s'h")
    .replaceAll('ch', "c'h")
    .replaceAll('zh', "z'h")
    .replaceAll('gh', "g'h")
    .replaceAll('nğ', "n'gh")
    .replaceAll('ñ', 'ng')
    .replaceAll('j', 'zh')
    .replaceAll('c', 'j')
    .replaceAll('ç', 'ch')
    .replaceAll('ş', 'sh')
    .replaceAll('ğ', 'gh')
    .replaceAll('v', 'w');
}

function uasToCts(text: string): string {
  return reviseCts(replaceViaTable(text, UAS_CHARS, CTS_CHARS));
}

/**
 * Capitalize the first letter of the text and after sentence-ending punctuation.
 * Arabic has no case, so UAS→ULS/UCS results need this for sentence case.
 */
function autoCapitalize(text: string): string {
  return text.replace(/(^|[.?!]\s+)(\p{L})/gu, (_, prefix: string, letter: string) => {
    return prefix + letter.toLocaleUpperCase('ug');
  });
}

/** Convert Uyghur Arabic Script (UAS) to Uyghur Latin Script (ULS). */
export function arabicToLatin(text: string): string {
  return autoCapitalize(ctsToUls(uasToCts(text).toLowerCase()));
}

/** Convert Uyghur Arabic Script (UAS) to Uyghur Cyrillic Script (UCS). */
export function arabicToCyrillic(text: string): string {
  const cts = uasToCts(text).toLowerCase().replaceAll('ya', 'я').replaceAll('yu', 'ю');
  return autoCapitalize(replaceViaTable(cts, CTS_CHARS, UCS_CHARS));
}

export type TargetScript = 'Arabic' | 'Latin' | 'Cyrillic';

/**
 * Convert Uyghur Arabic Script to the given target.
 * Thin wrapper mirroring the upstream converter call style.
 */
export function convertArabic(text: string, target: TargetScript): string {
  if (target === 'Arabic') return text;
  if (target === 'Latin') return arabicToLatin(text);
  return arabicToCyrillic(text);
}
