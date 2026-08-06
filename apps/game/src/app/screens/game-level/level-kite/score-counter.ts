import { Container, Sprite, Text, Texture } from 'pixi.js';

const SCORE_FRAME_ASSET = 'game-levels/game-level-kite/score-frame.png';
const FRAME_WIDTH = 240;
const FRAME_HEIGHT = 110;

export class ScoreCounter extends Container {
  public readonly scoreText: Text;

  constructor() {
    super();

    const frame = new Sprite(Texture.from(SCORE_FRAME_ASSET));
    frame.setSize(FRAME_WIDTH, FRAME_HEIGHT);

    this.scoreText = new Text({
      text: '0',
      resolution: 2,
      anchor: 0.5,
      style: { fill: 0x000000, fontFamily: 'Concert One', fontSize: 48, fontWeight: '700' },
    });
    this.scoreText.position.set(FRAME_WIDTH / 2, FRAME_HEIGHT / 2);

    this.addChild(frame, this.scoreText);
  }

  public setScore(score: number) {
    this.scoreText.text = String(score);
  }
}
