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
  Backquote: '`',
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
  Backslash: 'é',
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
  Backquote: '~',
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
  Backslash: 'É',
  ShiftLeft: '*Shift*',
  KeyZ: 'Z',
  KeyX: 'X',
  KeyC: 'C',
  KeyV: 'V',
  KeyB: 'B',
  KeyN: 'N',
  KeyM: 'M',
  Comma: '«',
  Period: '»',
  Slash: '?',
  AltLeft: '*Menu*',
  Space: ' ',
  Enter: '*Enter*',
};

/**
 * Uyghur Cyrillic layer based on the macOS Kazakh layout; Ұ/ұ (Digit9) replaced with Җ/җ.
 *
 * Departures from Kazakh for Uyghur punctuation: Digit3 types « (Shift: ») instead of і/І,
 * and Slash types - (Shift: ?) instead of /.
 *
 * `Backquote` and `IntlBackslash` never hold a letter: `IntlBackslash` exists only on ISO
 * keyboards, and on macOS ISO keyboards Chromium reports swapped `code` values for these two
 * keys (§ ↔ the key left of Z).
 *
 * TODO: the number row types letters, as in Kazakh, so digits can't be typed in Cyrillic
 * (the phone 123 page's digit keys type nothing either).
 */
const CYRILLIC_DEFAULT_LAYER: Record<string, string> = {
  Backquote: '(',
  Digit1: '"',
  Digit2: 'ә',
  Digit3: '«',
  Digit4: 'ң',
  Digit5: 'ғ',
  Digit6: ',',
  Digit7: '.',
  Digit8: 'ү',
  Digit9: 'җ',
  Digit0: 'қ',
  Minus: 'ө',
  Equal: 'һ',
  Backspace: '⌫',
  KeyQ: 'й',
  KeyW: 'ц',
  KeyE: 'у',
  KeyR: 'к',
  KeyT: 'е',
  KeyY: 'н',
  KeyU: 'г',
  KeyI: 'ш',
  KeyO: 'щ',
  KeyP: 'з',
  BracketLeft: 'х',
  BracketRight: 'ъ',
  Backslash: 'ё',
  KeyA: 'ф',
  KeyS: 'ы',
  KeyD: 'в',
  KeyF: 'а',
  KeyG: 'п',
  KeyH: 'р',
  KeyJ: 'о',
  KeyK: 'л',
  KeyL: 'д',
  Semicolon: 'ж',
  Quote: 'э',
  ShiftLeft: '*Shift*',
  IntlBackslash: ']',
  KeyZ: 'я',
  KeyX: 'ч',
  KeyC: 'с',
  KeyV: 'м',
  KeyB: 'и',
  KeyN: 'т',
  KeyM: 'ь',
  Comma: 'б',
  Period: 'ю',
  Slash: '-',
  AltLeft: '*Menu*',
  Space: ' ',
  Enter: '*Enter*',
};

/** Shifted Uyghur Cyrillic layer: capitals, plus the Kazakh Shift punctuation. */
const CYRILLIC_SHIFT_LAYER: Record<string, string> = {
  Backquote: ')',
  Digit1: '!',
  Digit2: 'Ә',
  Digit3: '»',
  Digit4: 'Ң',
  Digit5: 'Ғ',
  Digit6: ';',
  Digit7: ':',
  Digit8: 'Ү',
  Digit9: 'Җ',
  Digit0: 'Қ',
  Minus: 'Ө',
  Equal: 'Һ',
  Backspace: '⌫',
  KeyQ: 'Й',
  KeyW: 'Ц',
  KeyE: 'У',
  KeyR: 'К',
  KeyT: 'Е',
  KeyY: 'Н',
  KeyU: 'Г',
  KeyI: 'Ш',
  KeyO: 'Щ',
  KeyP: 'З',
  BracketLeft: 'Х',
  BracketRight: 'Ъ',
  Backslash: 'Ё',
  KeyA: 'Ф',
  KeyS: 'Ы',
  KeyD: 'В',
  KeyF: 'А',
  KeyG: 'П',
  KeyH: 'Р',
  KeyJ: 'О',
  KeyK: 'Л',
  KeyL: 'Д',
  Semicolon: 'Ж',
  Quote: 'Э',
  ShiftLeft: '*Shift*',
  IntlBackslash: '[',
  KeyZ: 'Я',
  KeyX: 'Ч',
  KeyC: 'С',
  KeyV: 'М',
  KeyB: 'И',
  KeyN: 'Т',
  KeyM: 'Ь',
  Comma: 'Б',
  Period: 'Ю',
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
const CHROME_AUXILIARY_KEYS = [
  'Backquote',
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
] as const;

/** Number-row keys, auxiliary where they type digits. */
const DIGIT_AUXILIARY_KEYS = [
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

const STRUCTURAL_AUXILIARY_KEYS = [...CHROME_AUXILIARY_KEYS, ...DIGIT_AUXILIARY_KEYS] as const;

/** Digit + punctuation keys that are auxiliary on Arabic / Latin layouts. */
const QWERTY_PUNCTUATION_AUXILIARY_KEYS = ['Minus', 'Equal', 'Semicolon', 'Quote'] as const;

const NON_LATIN_AUXILIARY_KEYS = new Set<string>(['BracketLeft', 'BracketRight', 'Backslash']);

const ARABIC_AUXILIARY_KEYS = new Set<string>([
  ...STRUCTURAL_AUXILIARY_KEYS,
  ...QWERTY_PUNCTUATION_AUXILIARY_KEYS,
  ...NON_LATIN_AUXILIARY_KEYS,
]);

const LATIN_AUXILIARY_KEYS = new Set<string>([
  ...STRUCTURAL_AUXILIARY_KEYS,
  ...QWERTY_PUNCTUATION_AUXILIARY_KEYS,
]);

/**
 * Kazakh-based Cyrillic puts letters on most of the number row and the punctuation keys, so
 * only the chrome and the number-row punctuation keys stay auxiliary.
 */
const CYRILLIC_AUXILIARY_KEYS = new Set<string>([
  ...CHROME_AUXILIARY_KEYS,
  'Digit1',
  'Digit3',
  'Digit6',
  'Digit7',
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

export function getMappedFromKeyCode(code: string, shift: boolean, capsLock = false): string {
  const mapped = getLayers()[shift ? 'shift' : 'default'][code] ?? '';
  if (!capsLock) return mapped;
  // Caps Lock inverts letter case like the OS does (Shift + Caps Lock → lowercase).
  // Caseless glyphs (Arabic letters, digits, punctuation) are unaffected.
  const upper = mapped.toLocaleUpperCase('ug');
  const lower = mapped.toLocaleLowerCase('ug');
  if (upper === lower) return mapped;
  return shift ? lower : upper;
}

/** Labels for modifier and special keys shown on the on-screen keyboard. */
export function formatKeyboardLabel(text: string): string {
  if (text.startsWith('*') && text.endsWith('*') && text.length > 1) {
    return text.slice(1, -1).toUpperCase();
  }
  return text;
}

export function getKeyboardLabel(code: string, shift: boolean, capsLock = false): string {
  const mapped = getMappedFromKeyCode(code, shift, capsLock);
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
  return getMappedFromKeyCode(event.code, event.shiftKey, event.getModifierState('CapsLock'));
}

/** Physical key, and whether Shift is held, that types `char` on the active layout. */
export function getKeyStrokeFromChar(char: string): { code: string; shift: boolean } | undefined {
  const layers = getLayers();
  for (const shift of [false, true]) {
    for (const [code, text] of Object.entries(layers[shift ? 'shift' : 'default'])) {
      if (text === char) return { code, shift };
    }
  }
  return undefined;
}

export function getKeyFromChar(char: string): string {
  for (const layer of Object.values(getLayers())) {
    for (const [code, text] of Object.entries(layer)) {
      if (text === char) return code;
    }
  }
  return '';
}

/** Mapped text of keys that type nothing in a level: Shift, Enter, Backspace and the like. */
function isControlKeyText(text: string): boolean {
  return text === '⌫' || (text.length > 1 && text.startsWith('*') && text.endsWith('*'));
}

/**
 * What a key press types in a level, or '' for a press levels ignore: auto-repeats, modifier
 * chords, and keys that type nothing (Shift, Tab, arrows, Escape, Enter, Backspace). Space
 * types ' '.
 */
export function getTypedText(event: KeyboardEvent): string {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return '';
  const typed = getMappedFromKeyboardEvent(event);
  return isControlKeyText(typed) ? '' : typed;
}
