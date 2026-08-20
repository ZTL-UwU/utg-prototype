import { getKeyboardLettersForScript } from '@utg/letters';
import { convertArabic, type TargetScript } from '@utg/script-converter';

import { scriptState } from '../zustandStores/scriptState';

const ARABIC_FONT = 'Noto Naskh Arabic Bold';
const LATIN_CYRILLIC_FONT = 'Nunito';

export function getCurrentTargetScript(): TargetScript {
  return scriptState.getState().currentScript;
}

/** Full keyboard letter pool for the player's selected orthography. */
export function getCurrentKeyboardLetters(): readonly string[] {
  return getKeyboardLettersForScript(getCurrentTargetScript());
}

/** True when the active orthography is written right-to-left (Arabic). */
export function isCurrentScriptRtl(): boolean {
  return getCurrentTargetScript() === 'Arabic';
}

/** Font for letter/word Text rendered in a given orthography. */
export function getFontFamilyForScript(script: TargetScript): string {
  return script === 'Arabic' ? ARABIC_FONT : LATIN_CYRILLIC_FONT;
}

/** Font for letter/word Text rendered in the current script. */
export function getScriptFontFamily(): string {
  return getFontFamilyForScript(getCurrentTargetScript());
}

/** Convert Arabic-script text to the player's selected orthography. */
export function convertToCurrentScript(text: string): string {
  return convertArabic(text, getCurrentTargetScript());
}

/**
 * Convert Arabic keyboard-letter targets so they match unshifted key glyphs.
 * Isolated hamza is stripped by the word converter; Latin types it as `'`.
 * Multi-character results (Latin ch/sh/gh/ng/zh, Cyrillic ла) split into one keystroke each.
 */
export function convertKeyboardLettersToCurrentScript(letters: readonly string[]): string[] {
  const script = getCurrentTargetScript();
  if (script === 'Arabic') return [...letters];

  return letters.flatMap((letter) => {
    let converted = convertArabic(letter, script).toLocaleLowerCase('ug');
    if (!converted && letter === 'ئ' && script === 'Latin') converted = "'";
    if (!converted) return [];
    return Array.from(converted);
  });
}
