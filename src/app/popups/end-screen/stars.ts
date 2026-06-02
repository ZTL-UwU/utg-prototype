import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

const STAR_ARC_SPREAD = 132;
const STAR_SHOW_STAGGER = 0.12;
const STAR_SHOW_DURATION = 0.45;
const STAR_SHOW_BASE_DELAY = 0.2;

export class Stars extends Container {
  private readonly starSprites: Sprite[];

  constructor(starCount: number, popupWidth: number) {
    const sideStarSize = popupWidth / 9;
    const middleStarSize = sideStarSize * 1.28;
    const arcHeight = middleStarSize * 0.35;

    super({
      layout: {
        width: STAR_ARC_SPREAD * 2 + middleStarSize,
        height: middleStarSize + arcHeight,
        alignSelf: 'center',
      },
    });

    const starLayouts = [
      { left: 0, top: arcHeight, size: sideStarSize },
      {
        left: STAR_ARC_SPREAD,
        top: 0,
        size: middleStarSize,
      },
      {
        left: STAR_ARC_SPREAD * 2 + middleStarSize - sideStarSize,
        top: arcHeight,
        size: sideStarSize,
      },
    ];

    this.starSprites = starLayouts.map((layout, index) => {
      const textureName =
        index < starCount ? 'end-screen/full-star.svg' : 'end-screen/empty-star.svg';
      const { left, top, size } = layout;

      const starContainer = new Container({
        layout: {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
        },
      });

      const star = new Sprite({
        texture: Texture.from(textureName),
        anchor: 0.5,
        position: { x: size / 2, y: size / 2 },
      });
      star.scale.set(0);
      star.alpha = 0;

      starContainer.addChild(star);
      this.addChild(starContainer);

      return star;
    });
  }

  public async playShowAnimation() {
    await Promise.all(
      this.starSprites.map((star, index) => {
        const delay = STAR_SHOW_BASE_DELAY + index * STAR_SHOW_STAGGER;

        return Promise.all([
          animate(star, { alpha: 1 }, { duration: STAR_SHOW_DURATION, ease: 'backOut', delay }),
          animate(
            star.scale,
            { x: 1, y: 1 },
            { duration: STAR_SHOW_DURATION, ease: 'backOut', delay },
          ),
        ]);
      }),
    );
  }
}
