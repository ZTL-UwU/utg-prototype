import { Container, Text } from 'pixi.js';

export class Title extends Container {
  private readonly heading: Text;

  constructor(title: string) {
    super();

    this.heading = new Text({
      text: title.toUpperCase(),
      style: {
        fontFamily: 'Concert One',
        fontSize: 60,
        fontWeight: '800',
        fill: 0x6b3f1f,
      },
    });
    this.heading.anchor.set(0.5, 0);
    this.addChild(this.heading);
  }

  resize(screenWidth: number) {
    this.position.set(screenWidth / 2, 30);
  }
}
