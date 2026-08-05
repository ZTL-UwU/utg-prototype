import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, type DestroyOptions } from 'pixi.js';

const HEART_ASSET = 'game-levels/game-level-flying/heart-full.png';
export const HEART_WIDTH = 56;
const HEART_GAP = 10;
const LOST_HEART_ALPHA = 0.22;

const BLINK_HALF_CYCLE_S = 0.125;
const BLINK_REPEATS = 7; // 8 half-cycles x 0.125s = 1.0s, ending back on alpha 1

/**
 * Shared by the bird and the heart it just lost so both pulse in step.
 *
 * Animates a plain number rather than the sprite: motion's `stop()` flushes one final
 * tick into whatever it owns, so if it owned `sprite.alpha` an interrupted blink would
 * overwrite the alpha the caller settles on afterwards.
 */
export function blinkAlpha(apply: (alpha: number) => void, onComplete?: () => void) {
  return animate(1, 0, {
    duration: BLINK_HALF_CYCLE_S,
    repeat: BLINK_REPEATS,
    repeatType: 'reverse',
    onUpdate: apply,
    onComplete,
  });
}

export class LivesBar extends Container {
  private readonly hearts: Sprite[] = [];
  private readonly maxLives: number;
  private lives: number;
  private blink?: AnimationPlaybackControls;

  constructor(maxLives: number) {
    super();
    this.maxLives = maxLives;
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

  /** Blinks the heart being lost, then settles it dimmed. */
  public loseLife(): number {
    if (this.lives <= 0) return this.lives;
    // resolve any in-flight blink under the old count before taking the next heart
    this.settleBlink();
    this.lives -= 1;
    const heart = this.hearts[this.lives];
    if (heart) {
      this.blink = blinkAlpha(
        (alpha) => {
          heart.alpha = alpha;
        },
        () => this.applyHeartAlphas(),
      );
    }
    return this.lives;
  }

  /** Single source of truth: a heart is lit iff it is still owed. */
  private applyHeartAlphas() {
    this.hearts.forEach((heart, index) => {
      heart.alpha = index < this.lives ? 1 : LOST_HEART_ALPHA;
    });
  }

  /** An interrupted blink stops wherever it was, so re-derive every heart from `lives`. */
  private settleBlink() {
    this.blink?.stop();
    this.blink = undefined;
    this.applyHeartAlphas();
  }

  /** Pooled screens are reused, so every heart has to come back lit. */
  public reset() {
    this.blink?.stop();
    this.blink = undefined;
    this.lives = this.maxLives;
    this.applyHeartAlphas();
  }

  override destroy(options?: DestroyOptions) {
    this.blink?.stop();
    super.destroy(options);
  }
}
