import { Container, Sprite, Texture } from 'pixi.js';

const STAR_COUNT = 3;
const STAR_ARC_SPREAD = 132;

export class Stars extends Container {
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
        left: STAR_ARC_SPREAD + (middleStarSize - sideStarSize) / 2,
        top: 0,
        size: middleStarSize,
      },
      {
        left: STAR_ARC_SPREAD * 2 + middleStarSize - sideStarSize,
        top: arcHeight,
        size: sideStarSize,
      },
    ];

    const stars = Array.from({ length: STAR_COUNT }, (_, index) => {
      const textureName =
        index < starCount ? 'end-screen/full-star.svg' : 'end-screen/empty-star.svg';
      const { left, top, size } = starLayouts[index];

      return new Sprite({
        texture: Texture.from(textureName),
        layout: {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
        },
      });
    });

    this.addChild(...stars);
  }
}
