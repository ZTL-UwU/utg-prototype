import type { GlyphPart } from './glyph-mask';
import lettersJson from './letters.json';

export type LETTER_FORMS = 'initial' | 'medial' | 'final' | 'isolated';

/** Right to left in the form bar: on its own, then its place in a word as it is read. */
export const FORM_ORDER: readonly LETTER_FORMS[] = ['isolated', 'initial', 'medial', 'final'];

export const FORM_LABELS: Record<LETTER_FORMS, string> = {
  isolated: 'alone',
  initial: 'start',
  medial: 'middle',
  final: 'end',
};

const HAMZA = 'ئ';

// each form's outline, split into parts, and the strokes it's written in, each clipped to the
// part at index `part`. baked from Noto Naskh Arabic by scripts/stroke-order/build.py
export type LetterEntry = {
  parts: GlyphPart[];
  /** Tatweel (ـ) on each side a connected form joins; only drawn, never traced or scored. */
  joins?: string[];
  /** `label` is an [x, y] pair, but JSON imports only type it as an array. */
  strokes: { d: string; width: number; part: number; label?: number[] }[];
};
const letters = lettersJson as Record<string, Partial<Record<string, LetterEntry>>>;

/** Vowels are baked without the hamza seat they're written on at the start of a word. */
export function getBaseForm(letter: string) {
  return letter.length > 1 && letter.startsWith(HAMZA) ? letter.slice(1) : letter;
}

export function getLetterEntry(letter: string, form: LETTER_FORMS) {
  return letters[getBaseForm(letter)]?.[form];
}

export function hasForm(letter: string, form: LETTER_FORMS) {
  return Boolean(getLetterEntry(letter, form));
}

/**
 * The widest and the tallest any form gets, tatweel included, in outline units, so every letter
 * can be drawn at the same scale. The outlines are straight lines only (M, L, Z), so every number
 * in them is a corner, x then y.
 */
export const GLYPH_EXTENT = (() => {
  let width = 0;
  let height = 0;
  for (const forms of Object.values(letters)) {
    for (const entry of Object.values(forms)) {
      if (!entry) continue;
      const paths = [...entry.parts.map(({ d }) => d), ...(entry.joins ?? [])];
      const numbers =
        paths
          .join(' ')
          .match(/-?[\d.]+/g)
          ?.map(Number) ?? [];
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i + 1 < numbers.length; i += 2) {
        minX = Math.min(minX, numbers[i]);
        maxX = Math.max(maxX, numbers[i]);
        minY = Math.min(minY, numbers[i + 1]);
        maxY = Math.max(maxY, numbers[i + 1]);
      }
      width = Math.max(width, maxX - minX);
      height = Math.max(height, maxY - minY);
    }
  }
  return { width, height };
})();
