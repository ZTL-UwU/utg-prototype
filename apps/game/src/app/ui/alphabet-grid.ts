import { FancyButton } from '@pixi/ui';
import { EDUCATION_LETTERS } from '@utg/letters';
import { animate } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

import { convertToCurrentScript, getScriptFontFamily } from '../../utils/script';
import alphabetTimings from './alphabet-timings.json';

export type AlphabetGridColorOptions = {
  panelColor: number;
  panelShadowColor: number;
  keyColor: number;
  keyPressedColor: number;
  keyShadowColor: number;
  keyHoverShadowColor: number;
  keyPressedShadowColor: number;
  textColor: number;
};

const KEY_SIZE = 120;
const KEY_GAP = 30;
const PANEL_PADDING = 80;
const PANEL_RADIUS = 100;

const DEFAULT_COLOR_OPTIONS: AlphabetGridColorOptions = {
  panelColor: 0xd1dcf0,
  panelShadowColor: 0x1b427a,
  keyColor: 0x5a8cd4,
  keyPressedColor: 0x22539a,
  keyShadowColor: 0x4673b8,
  keyHoverShadowColor: 0xfff5da,
  keyPressedShadowColor: 0x1b427a,
  textColor: 0xffffff,
};

const letters = [
  EDUCATION_LETTERS.slice(0, 8).reverse(),
  EDUCATION_LETTERS.slice(8, 16).reverse(),
  EDUCATION_LETTERS.slice(16, 24).reverse(),
  EDUCATION_LETTERS.slice(24, 32).reverse(),
];

function drawButton(
  size: number,
  state: 'default' | 'hover' | 'pressed',
  colors: AlphabetGridColorOptions,
) {
  const buttonColor = state === 'default' ? colors.keyColor : colors.keyPressedColor;
  const shadowColor =
    state === 'default'
      ? colors.keyShadowColor
      : state === 'hover'
        ? colors.keyHoverShadowColor
        : colors.keyPressedShadowColor;
  const hoverShadowSize = size * 1.1;
  const hoverPadding = size * 0.05;

  return state === 'hover'
    ? new Graphics()
        .roundRect(0, 0, hoverShadowSize, hoverShadowSize, 30)
        .fill({ color: shadowColor })
        .roundRect(hoverPadding, hoverPadding, size, size, 25)
        .fill({ color: buttonColor })
    : new Graphics()
        .roundRect(0, 4, size, size, 25)
        .fill({ color: shadowColor })
        .roundRect(0, 0, size, size, 25)
        .fill({ color: buttonColor });
}

export class AlphabetKey extends FancyButton {
  public readonly letter: string;

  constructor(
    letter: string,
    size: number,
    onClick: (letter: string) => void,
    colors: AlphabetGridColorOptions,
  ) {
    super({
      defaultView: drawButton(size, 'default', colors),
      pressedView: drawButton(size, 'pressed', colors),
      hoverView: drawButton(size, 'hover', colors),
      animations: {
        hover: {
          props: { scale: { x: 1.03, y: 1.03 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.97, y: 0.97 } },
          duration: 100,
        },
      },
      text: new Text({
        text: convertToCurrentScript(letter),
        resolution: 2,
        style: {
          align: 'center',
          fill: colors.textColor,
          fontFamily: getScriptFontFamily(),
          fontSize: size * 0.4,
          fontWeight: '700',
          padding: 20,
        },
      }),
      anchor: 0.5,
    });

    this.letter = letter;
    this.eventMode = 'static';
    this.onPress.connect(() => onClick(letter));
  }

  public setFocused(focused: boolean): void {
    this.setState(focused ? 'hover' : 'default');
  }

  public bounce(): void {
    const baseY = this.position.y;
    const bounceDepths = [30, 20, 5];
    this.setState('hover');
    void animate(
      this.position,
      {
        y: [
          baseY,
          baseY - bounceDepths[0],
          baseY,
          baseY - bounceDepths[1],
          baseY,
          baseY - bounceDepths[2],
          baseY,
        ],
      },
      { duration: 1.4, ease: 'easeOut' },
    ).then(() => {
      this.setState('default');
    });
  }
}

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

export class AlphabetGrid extends Container {
  private readonly panel = new Container();
  private readonly panelWidth: number;
  private readonly panelHeight: number;
  private readonly keyMap = new Map<string, AlphabetKey>();
  private readonly onLetterClick: (letter: string) => void;
  private songMode = false;
  private currentWidth = 0;
  private currentHeight = 0;
  private readonly colorOptions: AlphabetGridColorOptions;
  private focusedLetter: string | null = null;
  private listening = false;

  constructor(
    onClick: (letter: string) => void,
    colorOptions: AlphabetGridColorOptions = DEFAULT_COLOR_OPTIONS,
  ) {
    super({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    });

    this.colorOptions = colorOptions;
    this.onLetterClick = onClick;

    const columns = Math.max(...letters.map((row) => row.length));
    const rows = letters.length;

    this.panelWidth = columns * KEY_SIZE + (columns - 1) * KEY_GAP + PANEL_PADDING * 2;
    this.panelHeight = rows * KEY_SIZE + (rows - 1) * KEY_GAP + PANEL_PADDING * 2;

    const background = new Graphics()
      .roundRect(0, 15, this.panelWidth, this.panelHeight, PANEL_RADIUS)
      .fill({ color: this.colorOptions.panelShadowColor, alpha: 0.7 })
      .roundRect(0, 0, this.panelWidth, this.panelHeight, PANEL_RADIUS)
      .fill({ color: this.colorOptions.panelColor });
    this.panel.addChild(background);

    letters.forEach((row, rowIndex) => {
      row.forEach((letter, columnIndex) => {
        const key = new AlphabetKey(letter, KEY_SIZE, onClick, this.colorOptions);
        key.position.set(
          PANEL_PADDING + columnIndex * (KEY_SIZE + KEY_GAP) + KEY_SIZE / 2,
          PANEL_PADDING + rowIndex * (KEY_SIZE + KEY_GAP) + KEY_SIZE / 2,
        );
        this.panel.addChild(key);
        this.keyMap.set(letter, key);
      });
    });

    this.addChild(this.panel);
    this.setListening(true);
  }

  public resize(width: number, height: number) {
    this.currentWidth = width;
    this.currentHeight = height;
    this.applyResize(false);
  }

  public setSongMode(enabled: boolean) {
    this.songMode = enabled;
    this.applyResize(true);
    if (enabled) {
      this.clearFocus();
      this.setListening(false);
    } else {
      this.setListening(true);
    }
  }

  public pause() {
    this.setListening(false);
  }

  public resume() {
    if (!this.songMode) this.setListening(true);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.setListening(false);
    super.destroy(options);
  }

  public getLetterTimingOffsets(): { char: string; time: number }[] {
    return alphabetTimings.letters;
  }

  public bounceKey(char: string): void {
    this.keyMap.get(char)?.bounce();
  }

  private setListening(listening: boolean) {
    if (this.listening === listening) return;
    this.listening = listening;

    if (listening) {
      window.addEventListener('keydown', this.onKeyDown);
    } else {
      window.removeEventListener('keydown', this.onKeyDown);
    }
  }

  private clearFocus() {
    if (!this.focusedLetter) return;
    this.keyMap.get(this.focusedLetter)?.setFocused(false);
    this.focusedLetter = null;
  }

  private setFocus(letter: string) {
    if (this.focusedLetter && this.focusedLetter !== letter) {
      this.keyMap.get(this.focusedLetter)?.setFocused(false);
    }
    this.focusedLetter = letter;
    this.keyMap.get(letter)?.setFocused(true);
  }

  private findPosition(letter: string): { row: number; col: number } | null {
    for (let row = 0; row < letters.length; row += 1) {
      const col = letters[row]?.indexOf(letter as (typeof EDUCATION_LETTERS)[number]);
      if (col !== undefined && col >= 0) return { row, col };
    }
    return null;
  }

  private moveFocus(rowDelta: number, colDelta: number) {
    if (!this.focusedLetter) {
      this.setFocus(EDUCATION_LETTERS[0]!);
      return;
    }

    const position = this.findPosition(this.focusedLetter);
    if (!position) return;

    const rowCount = letters.length;
    const nextRow = (position.row + rowDelta + rowCount) % rowCount;
    const nextRowLetters = letters[nextRow];
    if (!nextRowLetters?.length) return;

    const nextCol = (position.col + colDelta + nextRowLetters.length) % nextRowLetters.length;
    const nextLetter = nextRowLetters[nextCol];
    if (nextLetter) this.setFocus(nextLetter);
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (ARROW_KEYS.has(event.key)) {
      event.preventDefault();
      if (event.key === 'ArrowLeft') this.moveFocus(0, -1);
      if (event.key === 'ArrowRight') this.moveFocus(0, 1);
      if (event.key === 'ArrowUp') this.moveFocus(-1, 0);
      if (event.key === 'ArrowDown') this.moveFocus(1, 0);
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (event.repeat || !this.focusedLetter) return;
    this.onLetterClick(this.focusedLetter);
  };

  private applyResize(animated: boolean) {
    const wFactor = this.songMode ? 0.97 : 0.9;
    const hFactor = this.songMode ? 0.96 : 0.78;
    const scale = Math.min(
      1,
      (this.currentWidth * wFactor) / this.panelWidth,
      (this.currentHeight * hFactor) / this.panelHeight,
    );
    const x = Math.round((this.currentWidth - this.panelWidth * scale) / 2);
    const y = Math.round((this.currentHeight - this.panelHeight * scale) / 2);

    if (animated) {
      void animate(this.panel.scale, { x: scale, y: scale }, { duration: 0.4, ease: 'backOut' });
      void animate(this.panel.position, { x, y }, { duration: 0.4, ease: 'backOut' });
    } else {
      this.panel.scale.set(scale);
      this.panel.position.set(x, y);
    }
  }
}
