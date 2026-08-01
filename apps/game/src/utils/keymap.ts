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
  BracketLeft: '[',
  BracketRight: ']',
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

/** Shifted ULY layer: symbols plus é / ö / ü on their base vowel keys. */
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
  KeyE: 'é',
  KeyU: 'ü',
  KeyO: 'ö',
  BracketLeft: '{',
  BracketRight: '}',
  Backquote: '~',
  Semicolon: ':',
  Quote: '"',
  Backslash: '|',
  ShiftLeft: '*Shift*',
  Comma: '<',
  Period: '>',
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
  return getCurrentTargetScript() === 'Latin' ? LATIN_LAYERS : ARABIC_LAYERS;
}

export function getMappedFromKeyCode(code: string, shift: boolean): string {
  const layer = getLayers()[shift ? 'shift' : 'default'];
  return layer[code] ?? '';
}

/** Labels for modifier and special keys shown on the on-screen keyboard. */
export function formatKeyboardLabel(text: string): string {
  if (text.startsWith('*') && text.endsWith('*')) {
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
  // Letter keys only (Arabic shift letters, Latin é/ö/ü) — skip punctuation.
  if (!/\p{L}/u.test(shiftText)) return '';
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
