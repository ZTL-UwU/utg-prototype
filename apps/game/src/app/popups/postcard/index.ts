import { animate } from 'motion';
import { Assets, Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';

const DIM_ALPHA = 0.5;
const CARD_VIEWPORT_RATIO = 0.9;
const FLIP_HALF_DURATION = 0.15;
const POSTCARD_ROOT = 'typing-levels/postcards';

// level title lowercased and hyphenated: "TANGRI TAH" -> "tangri-tah"
export function toPostcardSlug(title: string | undefined): string | undefined {
  const slug = title
    ?.trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || undefined;
}

// wheter or not a postcard exists for this slug
export function hasPostcard(slug: string): boolean {
  return Assets.resolver.hasKey(`${POSTCARD_ROOT}/${slug}/front.png`);
}

export class PostcardPopup extends Container {
  public static assetBundles = ['postcards'];

  private dimOverlay: Sprite;
  private cardScaler: Container;
  private cardFlipper: Container;
  private cardFront: Sprite;
  private cardBack?: Sprite;

  private isFlipping = false;
  private showingBack = false;

  constructor(slug: string) {
    super();

    this.dimOverlay = new Sprite({
      texture: Texture.WHITE,
      tint: 0x0,
      alpha: DIM_ALPHA,
    });
    this.dimOverlay.eventMode = 'static';
    this.dimOverlay.on('pointertap', () => {
      // handle mid flip taps
      if (this.isFlipping) return;
      void engine().navigation.hidePopup();
    });

    this.cardFront = new Sprite({
      texture: Texture.from(`${POSTCARD_ROOT}/${slug}/front.png`),
    });
    this.cardFront.anchor.set(0.5);

    // missing certain imgs
    const backAlias = `${POSTCARD_ROOT}/${slug}/back.png`;
    if (Assets.cache.has(backAlias)) {
      this.cardBack = new Sprite({ texture: Texture.from(backAlias) });
      this.cardBack.anchor.set(0.5);
      this.cardBack.visible = false;
    }

    this.cardFlipper = new Container();
    this.cardFlipper.addChild(this.cardFront);
    if (this.cardBack) {
      this.cardFlipper.addChild(this.cardBack);
      this.cardFlipper.eventMode = 'static';
      this.cardFlipper.cursor = 'pointer';
      this.cardFlipper.on('pointertap', () => {
        void this.flip();
      });
    }

    this.cardScaler = new Container();
    this.cardScaler.addChild(this.cardFlipper);

    this.addChild(this.dimOverlay, this.cardScaler);
  }

  /** Squash the card horizontally, swap faces at the midpoint, then expand it again */
  private async flip() {
    if (this.isFlipping || !this.cardBack) return;
    this.isFlipping = true;

    void engine().audio.sfx.play('typing-levels/postcards/paper-flip.mp3');

    await animate(
      this.cardFlipper.scale,
      { x: 0 },
      { duration: FLIP_HALF_DURATION, ease: 'easeIn' },
    );

    this.showingBack = !this.showingBack;
    this.cardFront.visible = !this.showingBack;
    this.cardBack.visible = this.showingBack;

    await animate(
      this.cardFlipper.scale,
      { x: 1 },
      { duration: FLIP_HALF_DURATION, ease: 'easeOut' },
    );

    this.isFlipping = false;
  }

  public async show() {
    void engine().audio.sfx.play('preload-audio/sfx/popup.mp3');

    // always open on the front face
    this.showingBack = false;
    this.cardFront.visible = true;
    if (this.cardBack) {
      this.cardBack.visible = false;
    }

    this.dimOverlay.alpha = 0;
    this.cardScaler.alpha = 0;
    this.cardFlipper.scale.set(0.5);

    await Promise.all([
      animate(this.dimOverlay, { alpha: DIM_ALPHA }, { duration: 0.25, ease: 'linear' }),
      animate(this.cardScaler, { alpha: 1 }, { duration: 0.25, ease: 'easeOut' }),
      // Overshoot past full size, then settle
      animate(
        this.cardFlipper.scale,
        { x: [0.5, 1.08, 0.96, 1.02, 1], y: [0.5, 1.08, 0.96, 1.02, 1] },
        {
          duration: 0.75,
          times: [0, 0.45, 0.65, 0.85, 1],
          ease: ['backOut', 'easeInOut', 'easeInOut', 'easeOut'],
        },
      ),
    ]);
  }

  public async hide() {
    await Promise.all([
      animate(this.dimOverlay, { alpha: 0 }, { duration: 0.2, ease: 'linear' }),
      animate(this.cardScaler, { alpha: 0 }, { duration: 0.2, ease: 'easeOut' }),
    ]);
  }

  public resize(width: number, height: number) {
    this.dimOverlay.width = width;
    this.dimOverlay.height = height;

    this.cardScaler.position.set(width / 2, height / 2);

    const { width: cardWidth, height: cardHeight } = this.cardFront.texture;
    const fit = Math.min(
      (width * CARD_VIEWPORT_RATIO) / cardWidth,
      (height * CARD_VIEWPORT_RATIO) / cardHeight,
      1,
    );
    this.cardScaler.scale.set(fit);
  }
}
