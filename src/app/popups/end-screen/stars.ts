import { Container, Sprite, Texture } from 'pixi.js';

export class Stars extends Container {
  private starsArray: Sprite[];

  constructor(starNum: number) {
    super({
      layout: {
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
      },
    });
    this.starsArray = Array.from({ length: 3 }, (_, i) => {
      const sprite =
        i < starNum
          ? new Sprite(Texture.from('end-screen/full-star.svg'))
          : new Sprite(Texture.from('end-screen/empty-star.svg'));
      sprite.layout = true;
      return sprite;
    });
    this.addChild(...this.starsArray);
  }

  resize(width: number, height: number) {
    const starSize = Math.min(width / 4, height);
    this.starsArray.forEach((star) => {
      star.layout = { width: starSize, height: starSize, flexShrink: 0 };
    });
    this.layout = {
      display: 'flex',
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      width,
      height,
    };
  }
}
