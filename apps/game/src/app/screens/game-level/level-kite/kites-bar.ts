import { Container, Sprite, Texture } from 'pixi.js';

const KITE_ASSET = 'game-levels/game-level-kite/kites/bar.png';
export const KITE_WIDTH = 56;
const KITE_GAP = 10;
const LOST_KITE_ALPHA = 0.22;

export class KitesBar extends Container {
  private readonly kites: Sprite[] = [];
  private readonly maxLives: number;
  private lives: number;

  constructor(maxLives: number) {
    super();
    this.maxLives = maxLives;
    this.lives = maxLives;

    for (let index = 0; index < maxLives; index += 1) {
      const kite = new Sprite({
        texture: Texture.from(KITE_ASSET),
        anchor: { x: 1, y: 0.5 },
      });
      kite.width = KITE_WIDTH;
      kite.height = (KITE_WIDTH / kite.texture.width) * kite.texture.height;
      kite.x = -index * (KITE_WIDTH + KITE_GAP);
      this.kites.push(kite);
      this.addChild(kite);
    }
  }

  public get remaining(): number {
    return this.lives;
  }

  public loseLife(): number {
    if (this.lives <= 0) return this.lives;
    this.lives -= 1;
    const kite = this.kites[this.lives];
    if (kite) kite.alpha = LOST_KITE_ALPHA;
    return this.lives;
  }

  public reset() {
    this.lives = this.maxLives;
    for (const kite of this.kites) {
      kite.alpha = 1;
    }
  }
}
