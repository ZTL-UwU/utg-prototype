import keymap from './keymap.json';

export type AlphabetEntry = { text: string; layerId: string };

export function getMappedFromKeyCode(code: string, shift: boolean): string {
  const layer = keymap.tablet.layer.find((layer) => layer.id === (shift ? 'shift' : 'default'));

  const flattenedKeys = layer?.row.map((r) => r.key).flat();
  const letter = flattenedKeys?.find((k) => k.id === code);
  return letter?.text ?? '';
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

export function getAlphabet(): AlphabetEntry[] {
  return keymap.tablet.layer.flatMap((layer) =>
    layer.row.flatMap((row) =>
      row.key
        .filter((key) => key.text.length && /\p{Script=Arabic}+/u.test(key.text))
        .map((key) => ({ text: key.text, layerId: layer.id })),
    ),
  );
}
