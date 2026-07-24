import { HTMLTextStyle } from 'pixi.js';

const WORD_COLORS = {
  BASE_BLUE: 0x1b427a,
  BASE_WHITE: 0xffffff,
  BASE_BROWN: 0x6b411e,
  CORRECT: 0x86bd65,
  ACTIVE: 0xffde59,
  ACTIVE_BROWN: 0xffde59,
} as const;

export function createExampleWordStyle(fontSize: number): HTMLTextStyle {
  return new HTMLTextStyle({
    fontSize,
    fill: WORD_COLORS.BASE_BLUE,
    fontFamily: 'Noto Naskh Arabic Bold',
    padding: 40,
    cssOverrides: ['direction: rtl'],
    tagStyles: {
      span: {
        fill: WORD_COLORS.CORRECT,
      },
    },
  });
}

export function createTypingWordStyle(fontSize: number, color: number): HTMLTextStyle {
  return new HTMLTextStyle({
    fontSize,
    fill: color,
    fontFamily: 'Noto Naskh Arabic Bold',
    padding: 40,
    cssOverrides: ['direction: rtl'],
    tagStyles: {
      completed: { fill: WORD_COLORS.CORRECT },
      active: { fill: WORD_COLORS.ACTIVE_BROWN },
    },
  });
}

export function createAdvancedTypingWordStyle(fontSize: number): HTMLTextStyle {
  return new HTMLTextStyle({
    fontSize,
    fill: WORD_COLORS.BASE_WHITE,
    fontFamily: 'Noto Naskh Arabic Bold',
    padding: 40,
    cssOverrides: ['direction: rtl'],
    tagStyles: {
      active: { fill: WORD_COLORS.ACTIVE },
    },
  });
}

export function getCompletedWordMarkup(letter: string, word: string): string {
  return `<span>${letter}</span>${word.slice(letter.length)}`;
}

export function getMissingWordMarkup(letter: string, word: string): string {
  return `_${word.slice(letter.length)}`;
}

export function getHighlightedWordMarkup(word: string, offset: number, length: number): string {
  return (
    `<completed>${word.slice(0, offset)}</completed>` +
    `<active>${word.slice(offset, offset + length)}</active>` +
    word.slice(offset + length)
  );
}
export function getAdvancedWordMarkup(word: string, offset: number, length: number): string {
  return (
    word.slice(0, offset) +
    `<active>${word.slice(offset, offset + length)}</active>` +
    word.slice(offset + length)
  );
}
