import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';

const PILL_HEIGHT = 56;
const PILL_PADDING_X = 28;
const PILL_RADIUS = PILL_HEIGHT / 2;
const PILL_COLOR = 0x000000;
const PILL_ALPHA = 0.72;
const TEXT_COLOR = 0xfdf7e7;

const FADE_IN = 0.15;
const HOLD = 3;
const FADE_OUT = 0.3;

/** Transient confirmation over the postcard. Centred on its own origin, so callers only position it. */
export class CopiedToast extends Container {
  private readonly pill: Graphics;
  private readonly label: Text;
  private readonly animations: AnimationPlaybackControls[] = [];

  /** Bumped on every flash so a re-press abandons the run already in flight. */
  private run = 0;

  constructor() {
    super();
    this.alpha = 0;

    this.pill = new Graphics();
    this.label = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Concert One',
        fontSize: 28,
        fill: TEXT_COLOR,
        align: 'center',
      }),
    });
    this.label.anchor.set(0.5);

    this.addChild(this.pill, this.label);
  }

  public async flash(message: string) {
    const run = ++this.run;
    this.stop();

    this.label.text = message;
    const width = this.label.width + PILL_PADDING_X * 2;
    this.pill
      .clear()
      .roundRect(-width / 2, -PILL_HEIGHT / 2, width, PILL_HEIGHT, PILL_RADIUS)
      .fill({ color: PILL_COLOR, alpha: PILL_ALPHA });

    await this.track(animate(this.alpha, 1, { duration: FADE_IN, ease: 'easeOut' }));
    if (run !== this.run) return;

    await this.track(animate(this.alpha, 1, { duration: HOLD }));
    if (run !== this.run) return;

    await this.track(animate(this.alpha, 0, { duration: FADE_OUT, ease: 'easeIn' }));
  }

  public stop() {
    for (const animation of this.animations) {
      animation.stop();
    }
    this.animations.length = 0;
  }

  public reset() {
    this.run++;
    this.stop();
    this.alpha = 0;
  }

  private async track(animation: AnimationPlaybackControls) {
    this.animations.push(animation);
    try {
      await animation;
    } catch {
      // `stop()` settles the animation as rejected; the run token decides what happens next.
    }
  }
}
