import { Container, Graphics } from 'pixi.js';

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

  constructor(letters: string[][]) {
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
        const key = new LetterKey(letter, KEY_SIZE);
        key.position.set(
          PANEL_PADDING + columnIndex * (KEY_SIZE + KEY_GAP) + KEY_SIZE / 2,
          PANEL_PADDING + rowIndex * (KEY_SIZE + KEY_GAP) + KEY_SIZE / 2,
        );
        this.panel.addChild(key);
      });
    });

    this.addChild(this.panel);
  }

  public resize(width: number, height: number) {
    const scale = Math.min(1, (width * 0.9) / this.panelWidth, (height * 0.85) / this.panelHeight);
    this.panel.scale.set(scale);
    this.panel.position.set(
      Math.round((width - this.panelWidth * scale) / 2),
      Math.round((height - this.panelHeight * scale) / 2),
    );
  }
}
