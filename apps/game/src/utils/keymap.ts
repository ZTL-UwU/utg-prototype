import { getCurrentTargetScript } from './script';

export type KeyEntry = { text: string; layerId: string };

type LayerId = 'default' | 'shift';
type LayerMap = Record<LayerId, Record<string, string>>;

/** Physical key code → glyph for the unshifted Uyghur Arabic keyboard layer. */
const ARABIC_DEFAULT_LAYER: Record<string, string> = {
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Digit0: '0',
  Minus: '-',
  Equal: '=',
  Backspace: '⌫',
  KeyQ: 'چ',
  KeyW: 'ۋ',
  KeyE: 'ې',
  KeyR: 'ر',
  KeyT: 'ت',
  KeyY: 'ي',
  KeyU: 'ۇ',
  KeyI: 'ڭ',
  KeyO: 'و',
  KeyP: 'پ',
  BracketLeft: ']',
  BracketRight: '[',
  Backquote: '`',
  KeyA: 'ھ',
  KeyS: 'س',
  KeyD: 'د',
  KeyF: 'ا',
  KeyG: 'ە',
  KeyH: 'ى',
  KeyJ: 'ق',
  KeyK: 'ك',
  KeyL: 'ل',
  Semicolon: '؛',
  Quote: "'",
  Backslash: '\\',
  ShiftLeft: '*Shift*',
  KeyZ: 'ز',
  KeyX: 'ش',
  KeyC: 'غ',
  KeyV: 'ۈ',
  KeyB: 'ب',
  KeyN: 'ن',
  KeyM: 'م',
  Comma: '،',
  Period: '.',
  Slash: 'ئ',
  AltLeft: '*Menu*',
  Space: ' ',
  Enter: '*Enter*',
};

/** Physical key code → glyph for the shifted Uyghur Arabic keyboard layer. */
const ARABIC_SHIFT_LAYER: Record<string, string> = {
  Digit1: '!',
  Digit2: '@',
  Digit3: '#',
  Digit4: '$',
  Digit5: '%',
  Digit6: '^',
  Digit7: '&',
  Digit8: '*',
  Digit9: ')',
  Digit0: '(',
  Minus: '_',
  Equal: '+',
  Backspace: '⌫',
  BracketLeft: '»',
  BracketRight: '«',
  Backquote: '~',
  KeyD: 'ژ',
  KeyF: 'ف',
  KeyG: 'گ',
  KeyH: 'خ',
  KeyJ: 'ج',
  KeyK: 'ۆ',
  KeyL: 'لا',
  Semicolon: ':',
  Quote: '"',
  Backslash: '|',
  ShiftLeft: '*Shift*',
  Comma: '>',
  Period: '<',
  Slash: '؟',
  AltLeft: '*Menu*',
  Space: ' ',
  Enter: '*Enter*',
};

/**
 * Uyghur Latin (ULY) QWERTY layer.
 * Digraphs (ch, sh, gh, ng, zh) are typed as separate base letters.
 */
const LATIN_DEFAULT_LAYER: Record<string, string> = {
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Digit0: '0',
  Minus: '-',
  Equal: '=',
  Backspace: '⌫',
  KeyQ: 'q',
  KeyW: 'w',
  KeyE: 'e',
  KeyR: 'r',
  KeyT: 't',
  KeyY: 'y',
  KeyU: 'u',
  KeyI: 'i',
  KeyO: 'o',
  KeyP: 'p',
  BracketLeft: 'ö',
  BracketRight: 'ü',
  Backquote: 'é',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
  KeyF: 'f',
  KeyG: 'g',
  KeyH: 'h',
  KeyJ: 'j',
  KeyK: 'k',
  KeyL: 'l',
  Semicolon: ';',
  Quote: "'",
  Backslash: '\\',
  ShiftLeft: '*Shift*',
  KeyZ: 'z',
  KeyX: 'x',
  KeyC: 'c',
  KeyV: 'v',
  KeyB: 'b',
  KeyN: 'n',
  KeyM: 'm',
  Comma: ',',
  Period: '.',
  Slash: '/',
  AltLeft: '*Menu*',
  Space: ' ',
  Enter: '*Enter*',
};

/** Shifted ULY layer: uppercase letters, symbols, and É / Ö / Ü on their dedicated keys. */
const LATIN_SHIFT_LAYER: Record<string, string> = {
  Digit1: '!',
  Digit2: '@',
  Digit3: '#',
  Digit4: '$',
  Digit5: '%',
  Digit6: '^',
  Digit7: '&',
  Digit8: '*',
  Digit9: '(',
  Digit0: ')',
  Minus: '_',
  Equal: '+',
  Backspace: '⌫',
  KeyQ: 'Q',
  KeyW: 'W',
  KeyE: 'E',
  KeyR: 'R',
  KeyT: 'T',
  KeyY: 'Y',
  KeyU: 'U',
  KeyI: 'I',
  KeyO: 'O',
  KeyP: 'P',
  BracketLeft: 'Ö',
  BracketRight: 'Ü',
  Backquote: 'É',
  KeyA: 'A',
  KeyS: 'S',
  KeyD: 'D',
  KeyF: 'F',
  KeyG: 'G',
  KeyH: 'H',
  KeyJ: 'J',
  KeyK: 'K',
  KeyL: 'L',
  Semicolon: ':',
  Quote: '"',
  Backslash: '|',
  ShiftLeft: '*Shift*',
  KeyZ: 'Z',
  KeyX: 'X',
  KeyC: 'C',
  KeyV: 'V',
  KeyB: 'B',
  KeyN: 'N',
  KeyM: 'M',
  Comma: '<',
  Period: '>',
  Slash: '?',
  AltLeft: '*Menu*',
  Space: ' ',
  Enter: '*Enter*',
};

/**
 * Uyghur Cyrillic phonetic layer — same physical positions as the Arabic keyboard.
 * Shift-layer letters: ж ф г х җ ө (mirroring ژ ف گ خ ج ۆ).
 */
const CYRILLIC_DEFAULT_LAYER: Record<string, string> = {
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Digit0: '0',
  Minus: '-',
  Equal: '=',
  Backspace: '⌫',
  KeyQ: 'ч',
  KeyW: 'в',
  KeyE: 'е',
  KeyR: 'р',
  KeyT: 'т',
  KeyY: 'й',
  KeyU: 'у',
  KeyI: 'ң',
  KeyO: 'о',
  KeyP: 'п',
  BracketLeft: ']',
  BracketRight: '[',
  Backquote: '`',
  KeyA: 'һ',
  KeyS: 'с',
  KeyD: 'д',
  KeyF: 'а',
  KeyG: 'ә',
  KeyH: 'и',
  KeyJ: 'қ',
  KeyK: 'к',
  KeyL: 'л',
  Semicolon: ';',
  Quote: "'",
  Backslash: '\\',
  ShiftLeft: '*Shift*',
  KeyZ: 'з',
  KeyX: 'ш',
  KeyC: 'ғ',
  KeyV: 'ү',
  KeyB: 'б',
  KeyN: 'н',
  KeyM: 'м',
  Comma: ',',
  Period: '.',
  Slash: '/',
  AltLeft: '*Menu*',
  Space: ' ',
  Enter: '*Enter*',
};

/** Shifted Uyghur Cyrillic phonetic layer. */
const CYRILLIC_SHIFT_LAYER: Record<string, string> = {
  Digit1: '!',
  Digit2: '@',
  Digit3: '#',
  Digit4: '$',
  Digit5: '%',
  Digit6: '^',
  Digit7: '&',
  Digit8: '*',
  Digit9: ')',
  Digit0: '(',
  Minus: '_',
  Equal: '+',
  Backspace: '⌫',
  BracketLeft: '»',
  BracketRight: '«',
  Backquote: '~',
  KeyD: 'ж',
  KeyF: 'ф',
  KeyG: 'г',
  KeyH: 'х',
  KeyJ: 'җ',
  KeyK: 'ө',
  Semicolon: ':',
  Quote: '"',
  Backslash: '|',
  ShiftLeft: '*Shift*',
  Comma: '>',
  Period: '<',
  Slash: '?',
  AltLeft: '*Menu*',
  Space: ' ',
  Enter: '*Enter*',
};

const ARABIC_LAYERS: LayerMap = {
  default: ARABIC_DEFAULT_LAYER,
  shift: ARABIC_SHIFT_LAYER,
};

const LATIN_LAYERS: LayerMap = {
  default: LATIN_DEFAULT_LAYER,
  shift: LATIN_SHIFT_LAYER,
};

const CYRILLIC_LAYERS: LayerMap = {
  default: CYRILLIC_DEFAULT_LAYER,
  shift: CYRILLIC_SHIFT_LAYER,
};

/** Modifier / chrome keys that are always styled as auxiliary. */
const STRUCTURAL_AUXILIARY_KEYS = [
  'Backspace',
  'Tab',
  'CapsLock',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'Enter',
  'Space',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Digit0',
] as const;

/** Digit + punctuation keys that are auxiliary on Arabic / Latin layouts. */
const QWERTY_PUNCTUATION_AUXILIARY_KEYS = [
  'Minus',
  'Equal',
  'Backslash',
  'Semicolon',
  'Quote',
] as const;

const NON_LATIN_AUXILIARY_KEYS = new Set<string>(['Backquote', 'BracketLeft', 'BracketRight']);

const ARABIC_AUXILIARY_KEYS = new Set<string>([
  ...STRUCTURAL_AUXILIARY_KEYS,
  ...QWERTY_PUNCTUATION_AUXILIARY_KEYS,
  ...NON_LATIN_AUXILIARY_KEYS,
]);

const LATIN_AUXILIARY_KEYS = new Set<string>([
  ...STRUCTURAL_AUXILIARY_KEYS,
  ...QWERTY_PUNCTUATION_AUXILIARY_KEYS,
]);

/** Phonetic Cyrillic uses the same auxiliary set as Arabic / Latin QWERTY chrome. */
const CYRILLIC_AUXILIARY_KEYS = new Set<string>([
  ...STRUCTURAL_AUXILIARY_KEYS,
  ...QWERTY_PUNCTUATION_AUXILIARY_KEYS,
  ...NON_LATIN_AUXILIARY_KEYS,
]);

const AUXILIARY_LABELS: Record<string, string> = {
  Tab: 'TAB',
  CapsLock: 'CAPS',
  ShiftLeft: 'SHIFT',
  ShiftRight: 'SHIFT',
  ControlLeft: 'CTRL',
  ControlRight: 'CTRL',
  AltLeft: 'MENU',
  AltRight: 'ALT',
  MetaLeft: 'WIN',
  MetaRight: 'WIN',
  Enter: 'ENTER',
  Space: '',
};

function getLayers(): LayerMap {
  switch (getCurrentTargetScript()) {
    case 'Latin':
      return LATIN_LAYERS;
    case 'Cyrillic':
      return CYRILLIC_LAYERS;
    default:
      return ARABIC_LAYERS;
  }
}

function getAuxiliaryKeys(): ReadonlySet<string> {
  switch (getCurrentTargetScript()) {
    case 'Latin':
      return LATIN_AUXILIARY_KEYS;
    case 'Cyrillic':
      return CYRILLIC_AUXILIARY_KEYS;
    default:
      return ARABIC_AUXILIARY_KEYS;
  }
}

/** True when the key should use auxiliary (non-letter) styling for the active layout. */
export function isAuxiliaryKey(code: string): boolean {
  return getAuxiliaryKeys().has(code);
}

export function getMappedFromKeyCode(code: string, shift: boolean): string {
  const layer = getLayers()[shift ? 'shift' : 'default'];
  return layer[code] ?? '';
}

/** Labels for modifier and special keys shown on the on-screen keyboard. */
export function formatKeyboardLabel(text: string): string {
  if (text.startsWith('*') && text.endsWith('*') && text.length > 1) {
    return text.slice(1, -1).toUpperCase();
  }
  return text;
}

export function getKeyboardLabel(code: string, shift: boolean): string {
  const mapped = getMappedFromKeyCode(code, shift);
  if (mapped.trim().length > 0) {
    return formatKeyboardLabel(mapped);
  }
  return AUXILIARY_LABELS[code] ?? '';
}

/** Shift-layer letter shown as a corner hint when Shift is not held. */
export function getShiftHintLabel(code: string): string {
  const defaultText = getMappedFromKeyCode(code, false);
  const shiftText = getMappedFromKeyCode(code, true);
  if (!shiftText || shiftText === defaultText) return '';
  // Letter keys only (Arabic/Cyrillic shift letters) — skip punctuation.
  if (!/\p{L}/u.test(shiftText)) return '';
  // Skip case-only counterparts of the same letter.
  if (shiftText.toLocaleLowerCase() === defaultText.toLocaleLowerCase()) return '';
  return formatKeyboardLabel(shiftText);
}

export function getMappedFromKeyboardEvent(event: KeyboardEvent): string {
  return getMappedFromKeyCode(event.code, event.shiftKey);
}

export function getKeyFromChar(char: string): string {
  for (const layer of Object.values(getLayers())) {
    for (const [code, text] of Object.entries(layer)) {
      if (text === char) return code;
    }
  }
  return '';
}
