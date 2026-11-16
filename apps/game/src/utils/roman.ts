const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Roman numeral for a 1-based position, falling back to digits past X. */
export function toRoman(n: number): string {
  return ROMAN_NUMERALS[n - 1] ?? String(n);
}
