import { Container, Sprite, Texture } from 'pixi.js';

const STAR_COUNT = 3;
const STAR_GAP = 10;

export class Stars extends Container {
  constructor(starCount: number, popupWidth: number) {
    const starSize = popupWidth / 8;

    super({
      layout: {
        display: 'flex',
        flexDirection: 'row',
        gap: STAR_GAP,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
      },
    });

    const stars = Array.from({ length: STAR_COUNT }, (_, index) => {
      const textureName =
        index < starCount ? 'end-screen/full-star.svg' : 'end-screen/empty-star.svg';
      const star = new Sprite({
        texture: Texture.from(textureName),
        layout: {
          width: starSize,
          height: starSize,
          flexShrink: 0,
        },
      });
      return star;
    });

    this.addChild(...stars);
  }
}
