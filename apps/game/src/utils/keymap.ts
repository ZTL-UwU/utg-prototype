export type KeyEntry = { text: string; layerId: string };

type LayerId = 'default' | 'shift';

/** Physical key code → glyph for the unshifted Uyghur keyboard layer. */
const DEFAULT_LAYER: Record<string, string> = {
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
  Space: '',
  Enter: '*Enter*',
};

/** Physical key code → glyph for the shifted Uyghur keyboard layer. */
const SHIFT_LAYER: Record<string, string> = {
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
  Space: '',
  Enter: '*Enter*',
};

const LAYERS: Record<LayerId, Record<string, string>> = {
  default: DEFAULT_LAYER,
  shift: SHIFT_LAYER,
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

export function getMappedFromKeyCode(code: string, shift: boolean): string {
  const layer = LAYERS[shift ? 'shift' : 'default'];
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
  if (mapped.length > 0) {
    return formatKeyboardLabel(mapped);
  }
  return AUXILIARY_LABELS[code] ?? '';
}

/** Shift-layer Arabic letter shown as a corner hint when Shift is not held. */
export function getShiftHintLabel(code: string): string {
  const defaultText = getMappedFromKeyCode(code, false);
  const shiftText = getMappedFromKeyCode(code, true);
  if (!shiftText || shiftText === defaultText) return '';
  if (!/\p{Script=Arabic}/u.test(shiftText)) return '';
  return formatKeyboardLabel(shiftText);
}

export function getMappedFromKeyboardEvent(event: KeyboardEvent): string {
  return getMappedFromKeyCode(event.code, event.shiftKey);
}

export function getKeyFromChar(char: string): string {
  for (const layer of Object.values(LAYERS)) {
    for (const [code, text] of Object.entries(layer)) {
      if (text === char) return code;
    }
  }
  return '';
}

export function getAllKeys(): KeyEntry[] {
  return (Object.entries(LAYERS) as [LayerId, Record<string, string>][]).flatMap(
    ([layerId, layer]) =>
      Object.values(layer)
        .filter((text) => text.length > 0 && /\p{Script=Arabic}+/u.test(text))
        .map((text) => ({ text, layerId })),
  );
}
