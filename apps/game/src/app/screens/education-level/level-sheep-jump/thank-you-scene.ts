import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, TilingSprite, type DestroyOptions } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { containScale, coverScale } from '../../../../engine/utils/maths';
import { waitFor } from '../../../../engine/utils/waitFor';

const BACKGROUND_TEXTURE = 'education-levels/education-level-sheep-jump/background.png';
const YURT_TEXTURE = 'education-levels/education-level-sheep-jump/kazakh-yurt.png';
const SHEEP_TEXTURE = 'mascots/sheep/dialog/thank-you.png';
/** The sheep's bleat, played as it thanks the player. */
const THANK_YOU_SOUND = 'education-levels/education-level-sheep-jump/sheep.mp3';

/** Each picture's largest size, and where its base stands, as screen shares. */
const YURT = { maxWidth: 0.48, maxHeight: 0.5, x: 0.56, y: 0.76 };
const SHEEP = { maxWidth: 0.24, maxHeight: 0.46, x: 0.34, y: 0.98 };
const FADE_DURATION = 0.3;
/** Seconds the scene stays up before the end popup. */
const HOLD = 1.5;

/** After a good run, the sheep reaches its yurt and thanks the player. */
export class ThankYouScene extends Container {
  private readonly background: TilingSprite;
  private readonly yurt: Sprite;
  private readonly sheep: Sprite;
  private fadeAnimation?: AnimationPlaybackControls;

  constructor() {
    super({ visible: false, alpha: 0 });
    const { width, height } = engine().navigation;
    this.background = new TilingSprite({
      texture: Texture.from(BACKGROUND_TEXTURE),
      width,
      height,
    });
    this.yurt = new Sprite({ texture: Texture.from(YURT_TEXTURE), anchor: { x: 0.5, y: 1 } });
    this.sheep = new Sprite({ texture: Texture.from(SHEEP_TEXTURE), anchor: { x: 0.5, y: 1 } });
    this.addChild(this.background, this.yurt, this.sheep);
  }

  public resize(width: number, height: number) {
    this.background.width = width;
    this.background.height = height;
    const { texture } = this.background;
    this.background.tileScale.set(coverScale(texture.width, texture.height, width, height));

    for (const [sprite, place] of [
      [this.yurt, YURT],
      [this.sheep, SHEEP],
    ] as const) {
      const { width: w, height: h } = sprite.texture;
      sprite.scale.set(containScale(w, h, width * place.maxWidth, height * place.maxHeight));
      sprite.position.set(width * place.x, height * place.y);
    }
  }

  /** Fade the scene in, bleat, and hold it a moment. */
  public async play() {
    const { width, height } = engine().navigation;
    this.resize(width, height);
    this.visible = true;
    this.alpha = 0;
    void engine().audio.sfx.play(THANK_YOU_SOUND);
    this.fadeAnimation = animate(this, { alpha: 1 }, { duration: FADE_DURATION, ease: 'easeOut' });
    await this.fadeAnimation.finished;
    await waitFor(HOLD);
  }

  override destroy(options?: DestroyOptions) {
    this.fadeAnimation?.stop();
    super.destroy(options);
  }
}
