import { FancyButton } from '@pixi/ui';
import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

import { getScriptFontFamily } from '../../../../utils/script';

const CARD_COLORS = {
  idle: 0x5a8cd4,
  selected: 0xc98144,
  found: 0x8ec24d,
  error: 0xef5a42,
} as const;

const SHADOW_COLORS = {
  idle: 0x4673b8,
  selected: 0xab6a33,
  found: 0x74a637,
  error: 0xd4452f,
} as const;

type TileLook = keyof typeof CARD_COLORS;

export type WordSearchTileOptions = {
  /** Already in the player's script (the grid is built from converted words). */
  letter: string;
  row: number;
  col: number;
  size: number;
  cornerRadius?: number;
  onPress: (tile: WordSearchTile) => void;
};

export class WordSearchTile extends FancyButton {
  public readonly letter: string;
  public readonly row: number;
  public readonly col: number;

  private readonly size: number;
  private readonly cornerRadius: number;
  private readonly shadow: Graphics;
  private readonly card: Graphics;

  private selected = false;
  private found = false;
  private feedbackAnimation?: AnimationPlaybackControls;

  constructor({ letter, row, col, size, cornerRadius = 14, onPress }: WordSearchTileOptions) {
    // drawn before super(): FancyButton sizes its anchor and hit area from the default view
    const shadow = new Graphics();
    const card = new Graphics();
    drawCard(shadow, card, 'idle', size, cornerRadius);
    const view = new Container();
    view.addChild(shadow, card);

    super({
      defaultView: view,
      text: new Text({
        text: letter,
        resolution: 2,
        style: {
          align: 'center',
          fill: 0xffffff,
          fontFamily: getScriptFontFamily(),
          fontSize: size * 0.5,
          fontWeight: '700',
          padding: 20,
        },
      }),
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
      anchor: 0.5,
    });

    this.letter = letter;
    this.row = row;
    this.col = col;
    this.size = size;
    this.cornerRadius = cornerRadius;
    this.shadow = shadow;
    this.card = card;

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.onPress.connect(() => onPress(this));
  }

  public get isSelected() {
    return this.selected;
  }

  public get isFound() {
    return this.found;
  }

  public setSelected(selected: boolean) {
    if (this.selected === selected) return;
    this.selected = selected;
    this.draw(this.baseLook());

    this.feedbackAnimation?.stop();
    this.rotation = 0;
    this.feedbackAnimation = selected
      ? animate([
          [this.scale, { x: 1.08, y: 1.08 }, { duration: 0.1, ease: 'backOut' }],
          [this.scale, { x: 1, y: 1 }, { type: 'spring', bounce: 0.35, duration: 0.3 }],
        ])
      : animate(this.scale, { x: 1, y: 1 }, { duration: 0.1, ease: 'easeOut' });
  }

  /** Turn green and settle. Stays tappable: a found tile can be a crossing cell of another word. */
  public async showFound() {
    this.found = true;
    this.selected = false;
    this.draw('found');

    this.feedbackAnimation?.stop();
    this.rotation = 0;
    this.feedbackAnimation = animate([
      [this.scale, { x: 1.12, y: 1.12 }, { duration: 0.14, ease: 'backOut' }],
      [this.scale, { x: 1, y: 1 }, { type: 'spring', bounce: 0.35, duration: 0.48 }],
    ]);
    await this.feedbackAnimation.finished;
  }

  /** Shake red, then fall back to the tile's base color (idle, or green if already found). */
  public async showIncorrect() {
    this.selected = false;
    this.draw('error');

    this.feedbackAnimation?.stop();
    this.scale.set(1);
    this.rotation = 0;
    const deg = Math.PI / 180;
    this.feedbackAnimation = animate([
      [this, { rotation: -16 * deg }, { duration: 0.04, ease: 'linear' }],
      [this, { rotation: 16 * deg }, { duration: 0.08, ease: 'linear' }],
      [this, { rotation: -10 * deg }, { duration: 0.08, ease: 'linear' }],
      [this, { rotation: 6 * deg }, { duration: 0.08, ease: 'linear' }],
      [this, { rotation: 0 }, { duration: 0.06, ease: 'easeOut' }],
    ]);
    await this.feedbackAnimation.finished;
    this.draw(this.baseLook());
  }

  public async playAppear(delay: number) {
    this.alpha = 0;
    this.scale.set(0.6);
    await Promise.all([
      animate(this.alpha, 1, { duration: 0.3, ease: 'backOut', delay }),
      animate(this.scale, { x: 1, y: 1 }, { duration: 0.3, ease: 'backOut', delay }),
    ]);
  }

  public override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.feedbackAnimation?.stop();
    super.destroy(options);
  }

  private baseLook(): TileLook {
    if (this.selected) return 'selected';
    return this.found ? 'found' : 'idle';
  }

  private draw(look: TileLook) {
    drawCard(this.shadow, this.card, look, this.size, this.cornerRadius);
  }
}

function drawCard(
  shadow: Graphics,
  card: Graphics,
  look: TileLook,
  size: number,
  cornerRadius: number,
) {
  shadow.clear().roundRect(0, 6, size, size, cornerRadius).fill({ color: SHADOW_COLORS[look] });
  card.clear().roundRect(0, 0, size, size, cornerRadius).fill({ color: CARD_COLORS[look] });
}
