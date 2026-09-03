import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Assets, Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { CopiedToast } from './copied-toast';
import { canCopyImages, loadFrontPng, POSTCARD_ROOT } from './front-png';

const DIM_ALPHA = 0.5;
const CARD_VIEWPORT_RATIO = 0.9;
const FLIP_HALF_DURATION = 0.15;

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

  private closeButton: FancyButton;
  private shareButton: FancyButton;
  private copiedToast: CopiedToast;

  private readonly slug: string;
  /** Warmed on construction, so the press handler never waits on the network. */
  private frontPng?: Promise<Blob>;
  private isCopying = false;

  constructor(slug: string) {
    super();

    this.slug = slug;

    this.dimOverlay = new Sprite({
      texture: Texture.WHITE,
      tint: 0x0,
      alpha: DIM_ALPHA,
    });
    this.dimOverlay.eventMode = 'static';

    this.cardFront = new Sprite({
      texture: Texture.from(`${POSTCARD_ROOT}/${slug}/front.png`),
    });
    this.cardFront.anchor.set(0.5);

    this.closeButton = new FancyButton({
      defaultView: 'typing-levels/postcards/x-button.svg',
      animations: {
        hover: {
          props: {
            scale: { x: 1.1, y: 1.1 },
          },
          duration: 100,
        },
        pressed: {
          props: {
            scale: { x: 0.97, y: 0.97 },
          },
          duration: 100,
        },
      },
      anchor: 0.5,
    });

    this.closeButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.hidePopup();
    });

    this.shareButton = new FancyButton({
      defaultView: 'typing-levels/postcards/share-button.svg',
      animations: {
        hover: {
          props: {
            scale: { x: 1.1, y: 1.1 },
          },
          duration: 100,
        },
        pressed: {
          props: {
            scale: { x: 0.97, y: 0.97 },
          },
          duration: 100,
        },
      },
      anchor: 0.5,
    });

    this.shareButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void this.copyFront();
    });

    this.copiedToast = new CopiedToast();

    // The share button only appears on the back face, so this has the whole flip to finish.
    if (canCopyImages()) {
      this.warmFrontPng();
    }

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

    // The toast sits outside `cardScaler` so the flip squash never touches it, and last so it
    // draws over the buttons.
    this.addChild(
      this.dimOverlay,
      this.cardScaler,
      this.closeButton,
      this.shareButton,
      this.copiedToast,
    );

    this.updateButtonsVisibility();
  }

  private warmFrontPng(): Promise<Blob> {
    const pending = (this.frontPng ??= loadFrontPng(this.slug));
    // Drop a failed load so the next press retries, and keep this copy from surfacing as an
    // unhandled rejection while the warm-up has no other awaiter.
    void pending.catch(() => {
      if (this.frontPng === pending) this.frontPng = undefined;
    });
    return pending;
  }

  /** Copy the postcard's front art to the clipboard as a PNG. */
  private async copyFront() {
    if (this.isCopying) return;
    this.isCopying = true;

    try {
      const pending = this.warmFrontPng();

      let item: ClipboardItem;
      try {
        // Safari drops the user gesture at the first await, so hand it the promise and let the
        // item be constructed synchronously inside the press.
        item = new ClipboardItem({ 'image/png': pending });
      } catch {
        // Engines that reject a promise value have no synchronous-gesture rule.
        item = new ClipboardItem({ 'image/png': await pending });
      }

      await navigator.clipboard.write([item]);
      void this.copiedToast.flash('Copied!');
    } catch {
      void this.copiedToast.flash("Couldn't copy");
    } finally {
      this.isCopying = false;
    }
  }

  /** Squash the card horizontally, swap faces at the midpoint, then expand it again */
  private async flip() {
    if (this.isFlipping || !this.cardBack) return;
    this.isFlipping = true;

    this.closeButton.visible = false;
    this.shareButton.visible = false;
    this.copiedToast.reset();

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
    this.updateButtonsVisibility();
  }

  public async show() {
    void engine().audio.sfx.play('preload-audio/sfx/popup.mp3');

    // always open on the front face
    this.showingBack = false;
    this.cardFront.visible = true;
    if (this.cardBack) {
      this.cardBack.visible = false;
    }
    this.copiedToast.reset();
    this.updateButtonsVisibility();

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
    this.copiedToast.reset();
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
    const cx = width / 2;
    const cy = height / 2;
    const halfW = (cardWidth * fit) / 2;
    const halfH = (cardHeight * fit) / 2;
    const insetX = 70 * fit;
    const insetY = 55 * fit;
    this.closeButton.position.set(cx - halfW + insetX, cy - halfH + insetY);
    this.shareButton.position.set(cx + halfW - insetX, cy + halfH - insetY);

    // Centred on the card, level with the close button.
    this.copiedToast.position.set(cx, cy - halfH + insetY);
    this.copiedToast.scale.set(fit);
  }

  private updateButtonsVisibility() {
    const cardBackExists = this.cardBack != null;
    this.closeButton.visible = cardBackExists && this.showingBack;
    // Hidden outright where the clipboard can't take an image, rather than failing on press.
    this.shareButton.visible = cardBackExists && this.showingBack && canCopyImages();
  }
}
