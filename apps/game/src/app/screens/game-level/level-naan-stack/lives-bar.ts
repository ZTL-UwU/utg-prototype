import { Container, Sprite, Texture } from 'pixi.js';

const HEART_ASSET = 'game-levels/game-level-2/heart-full.png';
const HEART_WIDTH = 56;
const HEART_GAP = 10;

export class LivesBar extends Container {
  private readonly hearts: Sprite[] = [];
  private lives: number;

  constructor(maxLives: number) {
    super();
    this.lives = maxLives;

    for (let index = 0; index < maxLives; index += 1) {
      const heart = new Sprite({
        texture: Texture.from(HEART_ASSET),
        anchor: { x: 1, y: 0.5 },
      });
      heart.width = HEART_WIDTH;
      heart.height = (HEART_WIDTH / heart.texture.width) * heart.texture.height;
      heart.x = -index * (HEART_WIDTH + HEART_GAP);
      this.hearts.push(heart);
      this.addChild(heart);
    }
  }

  public get remaining(): number {
    return this.lives;
  }

  public loseLife(): number {
    if (this.lives <= 0) return this.lives;
    this.lives -= 1;
    const heart = this.hearts[this.lives];
    if (heart) heart.alpha = 0.22;
    return this.lives;
  }
}
