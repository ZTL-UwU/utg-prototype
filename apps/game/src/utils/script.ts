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

/** Font for letter/word Text rendered in the current script. */
export function getScriptFontFamily(): string {
  return getCurrentTargetScript() === 'Arabic' ? ARABIC_FONT : LATIN_CYRILLIC_FONT;
}

/** Convert Arabic-script text to the player's selected orthography. */
export function convertToCurrentScript(text: string): string {
  return convertArabic(text, getCurrentTargetScript());
}
