/**
 * Uyghur Arabic (UAS) ↔ Latin (ULS) ↔ Cyrillic (UCS) converter.
 *
 * Ported from https://github.com/neouyghur/Uyghur-Multi-Script-Converter
 * (Apache-2.0). Conversion goes through Common Turkic Script (CTS).
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

/** Word-initial / post-non-consonant CTS vowels get a hamza when mapping to UAS. */
const CTS_INITIAL_VOWEL = /(?<=[^bptcçxdrzjsşfñlmhvyqkgnğ]|^)[aeéiouöü]/gu;

const UAS_VOWEL_PAIR = /(^|-|\s|[اەېىوۇۆۈ])([اەېىوۇۆۈ])/gu;

function replaceViaTable(text: string, from: readonly string[], to: readonly string[]): string {
  let result = text;
  for (let i = 0; i < from.length; i++) {
    result = result.replaceAll(from[i]!, to[i]!);
  }
  return result;
}

/**
 * After UAS→CTS letter mapping, normalize remaining hamza (ئ).
 * Medial hamza after a vowel is dropped; other leftover hamza becomes `'`.
 */
function reviseCts(text: string): string {
  let result = text.replace(LEADING_HAMZA, '');
  result = result.replace(/([aeéiouöü])\u0626/gu, '$1');
  return result.replaceAll('\u0626', "'");
}

/** Insert hamza before a UAS vowel that starts a word or follows another vowel. */
function reviseUas(text: string): string {
  return text.replace(UAS_VOWEL_PAIR, '$1ئ$2');
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

/** Uyghur Latin Script digraphs → Common Turkic Script. */
function ulsToCts(text: string): string {
  return text
    .replaceAll('j', 'c')
    .replaceAll('ng', 'ñ')
    .replaceAll("n'g", 'ng')
    .replaceAll("'ng", 'ñ')
    .replaceAll('ch', 'ç')
    .replaceAll('zh', 'j')
    .replaceAll('sh', 'ş')
    .replaceAll("'gh", 'ğ')
    .replaceAll('gh', 'ğ')
    .replaceAll('w', 'v');
}

function uasToCts(text: string): string {
  return reviseCts(replaceViaTable(text, UAS_CHARS, CTS_CHARS));
}

function ucsToCts(text: string): string {
  return replaceViaTable(text.toLowerCase(), UCS_CHARS, CTS_CHARS)
    .replaceAll('я', 'ya')
    .replaceAll('ю', 'yu');
}

function ctsToUas(text: string): string {
  const withHamza = text.replace(CTS_INITIAL_VOWEL, '\u0626$&');
  return reviseUas(replaceViaTable(withHamza, CTS_CHARS, UAS_CHARS).replaceAll("'", ''));
}

function ctsToUcs(text: string): string {
  const folded = text.replaceAll('ya', 'я').replaceAll('yu', 'ю');
  return replaceViaTable(folded, CTS_CHARS, UCS_CHARS);
}

export type ConvertOptions = {
  /**
   * Capitalize the first letter of the text and after sentence-ending punctuation.
   * Arabic has no case, so this only affects Latin/Cyrillic output. Defaults to true.
   */
  autoCapitalize?: boolean;
};

/**
 * Capitalize the first letter of the text and after sentence-ending punctuation.
 * Arabic has no case, so outputs in Latin/Cyrillic need this for sentence case.
 */
function autoCapitalize(text: string): string {
  return text.replace(/(^|[.?!]\s+)(\p{L})/gu, (_, prefix: string, letter: string) => {
    return prefix + letter.toLocaleUpperCase('ug');
  });
}

function withAutoCapitalize(text: string, options?: ConvertOptions): string {
  return options?.autoCapitalize === false ? text : autoCapitalize(text);
}

/** Convert Uyghur Arabic Script (UAS) to Uyghur Latin Script (ULS). */
export function arabicToLatin(text: string, options?: ConvertOptions): string {
  return withAutoCapitalize(ctsToUls(uasToCts(text).toLowerCase()), options);
}

/** Convert Uyghur Arabic Script (UAS) to Uyghur Cyrillic Script (UCS). */
export function arabicToCyrillic(text: string, options?: ConvertOptions): string {
  return withAutoCapitalize(ctsToUcs(uasToCts(text).toLowerCase()), options);
}

/** Convert Uyghur Latin Script (ULS) to Uyghur Arabic Script (UAS). */
export function latinToArabic(text: string): string {
  return ctsToUas(ulsToCts(text.toLowerCase()));
}

/** Convert Uyghur Latin Script (ULS) to Uyghur Cyrillic Script (UCS). */
export function latinToCyrillic(text: string, options?: ConvertOptions): string {
  return withAutoCapitalize(ctsToUcs(ulsToCts(text.toLowerCase())), options);
}

/** Convert Uyghur Cyrillic Script (UCS) to Uyghur Arabic Script (UAS). */
export function cyrillicToArabic(text: string): string {
  return ctsToUas(ucsToCts(text));
}

/** Convert Uyghur Cyrillic Script (UCS) to Uyghur Latin Script (ULS). */
export function cyrillicToLatin(text: string, options?: ConvertOptions): string {
  return withAutoCapitalize(ctsToUls(ucsToCts(text)), options);
}

export type TargetScript = 'Arabic' | 'Latin' | 'Cyrillic';

/** Convert between Uyghur Arabic, Latin, and Cyrillic scripts. */
export function convert(
  text: string,
  from: TargetScript,
  to: TargetScript,
  options?: ConvertOptions,
): string {
  if (from === to) return text;
  switch (from) {
    case 'Arabic':
      return to === 'Latin' ? arabicToLatin(text, options) : arabicToCyrillic(text, options);
    case 'Latin':
      return to === 'Arabic' ? latinToArabic(text) : latinToCyrillic(text, options);
    case 'Cyrillic':
      return to === 'Arabic' ? cyrillicToArabic(text) : cyrillicToLatin(text, options);
  }
}

/**
 * Convert Uyghur Arabic Script to the given target.
 * Thin wrapper mirroring the upstream converter call style.
 */
export function convertArabic(
  text: string,
  target: TargetScript,
  options?: ConvertOptions,
): string {
  return convert(text, 'Arabic', target, options);
}
