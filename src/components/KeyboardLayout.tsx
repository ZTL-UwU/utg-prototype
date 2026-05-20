import { useEffect, useState } from 'react';

import { getMappedFromKeyCode } from '../utils/keymap';

type Key = {
  code: string;
  width?: number;
};

const qwerty: Key[][] = [
  [
    { code: 'Digit1' },
    { code: 'Digit2' },
    { code: 'Digit3' },
    { code: 'Digit4' },
    { code: 'Digit5' },
    { code: 'Digit6' },
    { code: 'Digit7' },
    { code: 'Digit8' },
    { code: 'Digit9' },
    { code: 'Digit0' },
    { code: 'Minus' },
    { code: 'Equal' },
    { code: 'Backspace' },
  ],
  [
    { code: 'KeyQ' },
    { code: 'KeyW' },
    { code: 'KeyE' },
    { code: 'KeyR' },
    { code: 'KeyT' },
    { code: 'KeyY' },
    { code: 'KeyU' },
    { code: 'KeyI' },
    { code: 'KeyO' },
    { code: 'KeyP' },
    { code: 'BracketLeft' },
    { code: 'BracketRight' },
  ],
  [
    { code: 'KeyA' },
    { code: 'KeyS' },
    { code: 'KeyD' },
    { code: 'KeyF' },
    { code: 'KeyG' },
    { code: 'KeyH' },
    { code: 'KeyJ' },
    { code: 'KeyK' },
    { code: 'KeyL' },
    { code: 'Semicolon' },
    { code: 'Quote' },
  ],
  [
    { code: 'KeyZ' },
    { code: 'KeyX' },
    { code: 'KeyC' },
    { code: 'KeyV' },
    { code: 'KeyB' },
    { code: 'KeyN' },
    { code: 'KeyM' },
    { code: 'Comma' },
    { code: 'Period' },
    { code: 'Slash' },
  ],
];

export function KeyboardLayout() {
  const [pressedCodes, setPressedCodes] = useState(() => new Set<string>());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      setPressedCodes((prev) => new Set(prev).add(event.code));
    };

    const onKeyUp = (event: KeyboardEvent) => {
      setPressedCodes((prev) => {
        const next = new Set(prev);
        next.delete(event.code);
        return next;
      });
    };

    const clearPressed = () => setPressedCodes(new Set());

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearPressed);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearPressed);
    };
  }, []);

  return (
    <div className="absolute bottom-10 flex w-screen">
      <div
        className="mx-auto flex flex-col gap-2 rounded-4xl bg-[#f3ca8a] p-6 select-none shadow-[inset_0_-10px_0_#c98144] drop-shadow-lg"
        style={{ ['--u' as string]: '4.2rem' }}
      >
        {qwerty.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2">
            {row.map(({ code, width = 1 }) => {
              const key = getMappedFromKeyCode(
                code,
                pressedCodes.has('ShiftLeft') || pressedCodes.has('ShiftRight'),
              );

              return (
                <div
                  key={code}
                  className={`relative flex h-(--u) flex-col items-center justify-center rounded-xl ${
                    pressedCodes.has(code) ? 'bg-[#8d6241]' : 'bg-[#c98144]'
                  }`}
                  style={{ width: `calc(var(--u) * ${width})` }}
                >
                  <span className="font-naskh text-3xl leading-none font-bold text-white">
                    {key}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
