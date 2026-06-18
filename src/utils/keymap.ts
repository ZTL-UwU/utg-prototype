import keymap from './keymap.json';

export type KeyEntry = { text: string; layerId: string };

export function getMappedFromKeyCode(code: string, shift: boolean): string {
  const layer = keymap.tablet.layer.find((layer) => layer.id === (shift ? 'shift' : 'default'));

  const flattenedKeys = layer?.row.map((r) => r.key).flat();
  const letter = flattenedKeys?.find((k) => k.id === code);
  return letter?.text ?? '';
}

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

export function getMappedFromKeyboardEvent(event: KeyboardEvent): string {
  return getMappedFromKeyCode(event.code, event.shiftKey);
}

export function getKeyFromChar(char: string): string {
  const alphabet = keymap.tablet.layer
    .map((layer) => layer.row)
    .flat()
    .map((row) => row.key)
    .flat()
    .filter((c) => c.text.length);

  const key = alphabet.find((c) => c.text === char);
  return key?.id ?? '';
}

export function getAllKeys(): KeyEntry[] {
  return keymap.tablet.layer.flatMap((layer) =>
    layer.row.flatMap((row) =>
      row.key
        .filter((key) => key.text.length && /\p{Script=Arabic}+/u.test(key.text))
        .map((key) => ({ text: key.text, layerId: layer.id })),
    ),
  );
}
