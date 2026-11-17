import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, type DestroyOptions } from 'pixi.js';

const ICON_WIDTH = 56;
const ICON_GAP = 10;
const LOST_ICON_ALPHA = 0.22;

const BLINK_HALF_CYCLE_S = 0.125;
const DEFAULT_BLINK_S = 1;

/**
 * Pulse an alpha from 1 to 0 and back for about `durationS`, ending on 1. A level's bird and
 * the heart it just lost share it, so both pulse in step.
 *
 * Animates a plain number rather than the sprite: motion's `stop()` flushes one final tick into
 * whatever it owns, so if it owned `sprite.alpha` an interrupted blink would overwrite the alpha
 * the caller settles on afterwards.
 */
export function blinkAlpha(
  apply: (alpha: number) => void,
  { durationS = DEFAULT_BLINK_S, onComplete }: { durationS?: number; onComplete?: () => void } = {},
) {
  // An even number of half-cycles ends back on alpha 1.
  const halfCycles = Math.max(2, 2 * Math.round(durationS / (2 * BLINK_HALF_CYCLE_S)));
  return animate(1, 0, {
    duration: BLINK_HALF_CYCLE_S,
    repeat: halfCycles - 1,
    repeatType: 'reverse',
    onUpdate: apply,
    onComplete,
  });
}

type LivesBarOptions = {
  maxLives: number;
  /** Texture alias of one life: a heart, a kite. */
  icon: string;
  /** Seconds a lost life blinks before settling dimmed; 0 dims it at once. */
  blinkSeconds?: number;
};

/** A row of lives growing leftward from its origin; lost ones dim. */
export class LivesBar extends Container {
  private readonly icons: Sprite[] = [];
  private readonly blinkSeconds: number;
  private readonly maxLives: number;
  private lives: number;
  private blink?: AnimationPlaybackControls;

  constructor({ maxLives, icon, blinkSeconds = 0 }: LivesBarOptions) {
    super();
    this.maxLives = maxLives;
    this.lives = maxLives;
    this.blinkSeconds = blinkSeconds;

    for (let index = 0; index < maxLives; index += 1) {
      const sprite = new Sprite({ texture: Texture.from(icon), anchor: { x: 1, y: 0.5 } });
      sprite.width = ICON_WIDTH;
      sprite.height = (ICON_WIDTH / sprite.texture.width) * sprite.texture.height;
      sprite.x = -index * (ICON_WIDTH + ICON_GAP);
      this.icons.push(sprite);
      this.addChild(sprite);
    }
  }

  /** Take a life, blinking it out when the bar blinks. Returns the lives left. */
  public loseLife(): number {
    if (this.lives <= 0) return this.lives;
    // Resolve any in-flight blink under the old count before taking the next life.
    this.settleBlink();
    this.lives -= 1;
    const icon = this.icons[this.lives];
    if (icon && this.blinkSeconds > 0) {
      this.blink = blinkAlpha((alpha) => (icon.alpha = alpha), {
        durationS: this.blinkSeconds,
        onComplete: () => this.applyAlphas(),
      });
    } else {
      this.applyAlphas();
    }
    return this.lives;
  }

  /** A life is lit iff it is still owed. */
  private applyAlphas() {
    this.icons.forEach((icon, index) => {
      icon.alpha = index < this.lives ? 1 : LOST_ICON_ALPHA;
    });
  }

  /** An interrupted blink stops wherever it was, so re-derive every life from `lives`. */
  private settleBlink() {
    this.blink?.stop();
    this.blink = undefined;
    this.applyAlphas();
  }

  /** Every life back, for levels that refill them each round. */
  public reset() {
    this.blink?.stop();
    this.blink = undefined;
    this.lives = this.maxLives;
    this.applyAlphas();
  }

  override destroy(options?: DestroyOptions) {
    this.blink?.stop();
    super.destroy(options);
  }
}
