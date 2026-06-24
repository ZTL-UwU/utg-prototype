import { animate } from 'motion';
import { Container, Graphics } from 'pixi.js';

import alphabetTimings from './alphabet-timings.json';
import { LetterKey } from './letter-key';

const KEY_SIZE = 120;
const KEY_GAP = 30;
const PANEL_PADDING = 80;
const PANEL_RADIUS = 100;
const PANEL_COLOR = 0xd1dcf0;
const PANEL_SHADOW_COLOR = 0x1b427a;

export class LetterGrid extends Container {
  private readonly panel = new Container();
  private readonly panelWidth: number;
  private readonly panelHeight: number;
  private readonly keyMap = new Map<string, LetterKey>();
  private songMode = false;
  private currentWidth = 0;
  private currentHeight = 0;

  constructor(letters: string[][], onKeyPress?: () => void) {
    super({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    });

    const columns = Math.max(...letters.map((row) => row.length));
    const rows = letters.length;

    this.panelWidth = columns * KEY_SIZE + (columns - 1) * KEY_GAP + PANEL_PADDING * 2;
    this.panelHeight = rows * KEY_SIZE + (rows - 1) * KEY_GAP + PANEL_PADDING * 2;

    const background = new Graphics()
      .roundRect(0, 15, this.panelWidth, this.panelHeight, PANEL_RADIUS)
      .fill({ color: PANEL_SHADOW_COLOR, alpha: 0.7 })
      .roundRect(0, 0, this.panelWidth, this.panelHeight, PANEL_RADIUS)
      .fill({ color: PANEL_COLOR });
    this.panel.addChild(background);

    letters.forEach((row, rowIndex) => {
      row.forEach((letter, columnIndex) => {
        const key = new LetterKey(letter, KEY_SIZE, onKeyPress);
        key.position.set(
          PANEL_PADDING + columnIndex * (KEY_SIZE + KEY_GAP) + KEY_SIZE / 2,
          PANEL_PADDING + rowIndex * (KEY_SIZE + KEY_GAP) + KEY_SIZE / 2,
        );
        this.panel.addChild(key);
        this.keyMap.set(letter, key);
      });
    });

    this.addChild(this.panel);
  }

  public resize(width: number, height: number) {
    this.currentWidth = width;
    this.currentHeight = height;
    this.applyResize(false);
  }

  public setSongMode(enabled: boolean) {
    this.songMode = enabled;
    this.applyResize(true);
  }

  public getLetterTimingOffsets(): { char: string; time: number }[] {
    return alphabetTimings.letters;
  }

  public bounceKey(char: string): void {
    this.keyMap.get(char)?.bounce();
  }

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
