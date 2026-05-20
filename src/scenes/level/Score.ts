import { Container, Graphics, Text } from 'pixi.js';

const WIDTH = 180;
const HEIGHT = 70;
const MARGIN = 30;

export class Score extends Container {
  private readonly scoreText: Text;

  constructor() {
    super();

    const background = new Graphics().roundRect(0, 0, WIDTH, HEIGHT, 20).fill(0xd0823c);

    this.scoreText = new Text({
      text: 'Score: 0',
      style: {
        fontFamily: 'Noto Sans',
        fontSize: 24,
        fontWeight: '800',
        fill: 0xffffff,
      },
    });
    this.scoreText.anchor.set(0.5);
    this.scoreText.position.set(WIDTH / 2, HEIGHT / 2);

    this.addChild(background, this.scoreText);
  }

  setScore(score: number) {
    this.scoreText.text = `Score: ${score}`;
  }

  resize(screenWidth: number) {
    this.position.set(screenWidth - WIDTH - MARGIN, MARGIN);
  }
}
