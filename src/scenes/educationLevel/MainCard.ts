import { DropShadowFilter } from 'pixi-filters';
import { Container, Graphics } from 'pixi.js';

import { GRID_H, GRID_W, LetterGrid } from './letterGrid';
import { SoundButton } from './SoundButton';

const PAD_X = 48;
const PAD_TOP = 40;
const PAD_BOT = 40;
const SPEAKER_SIZE = 96;
const SPEAKER_GAP = 32;

export const CARD_W = GRID_W + 2 * PAD_X;
export const CARD_H = PAD_TOP + SPEAKER_SIZE + SPEAKER_GAP + GRID_H + PAD_BOT;

const CARD_COLOR = 0xc4d0f0;
const CARD_RADIUS = 28;

export class MainCard extends Container {
  constructor(soundButton: SoundButton, letterGrid: LetterGrid) {
    super();

    const bg = new Graphics()
      .roundRect(0, 0, CARD_W, CARD_H, CARD_RADIUS)
      .fill({ color: CARD_COLOR });

    this.filters = [
      new DropShadowFilter({ color: 0x000000, alpha: 0.18, blur: 16, offset: { x: 0, y: 6 } }),
    ];

    soundButton.x = CARD_W / 2;
    soundButton.y = PAD_TOP + SPEAKER_SIZE / 2;

    letterGrid.x = PAD_X;
    letterGrid.y = PAD_TOP + SPEAKER_SIZE + SPEAKER_GAP;

    this.addChild(bg, soundButton, letterGrid);
  }

  resize(screenWidth: number, screenHeight: number) {
    this.position.set((screenWidth - CARD_W) / 2, (screenHeight - CARD_H) / 2);
  }
}
