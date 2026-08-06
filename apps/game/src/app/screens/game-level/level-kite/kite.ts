import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

// indexed by damage taken: pristine -> faded -> torn
const STAGE_TEXTURES = [
  'game-levels/game-level-kite/kites/2.png',
  'game-levels/game-level-kite/kites/3.png',
  'game-levels/game-level-kite/kites/4.png',
];
const DEGRADE_STEP_RATIO = 0.2; // of screenHeight
const DEGRADE_DURATION_S = 0.6;
const FALL_DURATION_S = 0.9;
const ENTRY_DURATION_S = 1.5;

// wide and shallow — the gust's idle ellipse turned on its side
const IDLE_RADIUS_X = 20;
const IDLE_RADIUS_Y = 3;
const IDLE_DURATION_S = 5;

export class Kite extends Container {
  private sprite: Sprite;

  // layout
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  private damage: number = 0;
  private airborne: boolean = false;
  private anim?: AnimationPlaybackControls;
  private idleAnim?: AnimationPlaybackControls;

  constructor() {
    super();

    this.sprite = new Sprite(Texture.from(STAGE_TEXTURES[0]));
    this.sprite.anchor.set(0.5);
    this.alpha = 0;

    this.addChild(this.sprite);
  }

  public resize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  public async playEntryAnimation() {
    if (this.airborne) return; // still up there — leave it drifting where it is
    this.airborne = true;
    const fromY = this.screenHeight + this.height;
    this.position.set(this.restX, fromY);
    await Promise.all([
      this.track(
        animate(
          this.position,
          { y: [fromY, this.restY] },
          { duration: ENTRY_DURATION_S, ease: 'easeOut' },
        ),
      ),
      animate(this, { alpha: [0, 1] }, { duration: 1, ease: 'linear' }),
    ]);
    if (this.destroyed) return; // the kite may be torn down mid-flight
    this.startIdleAnimation();
  }

  public async playSoarAnimation() {
    this.airborne = false;
    this.stopIdleAnimation();
    const startY = this.position.y;
    const offTop = -this.height; // fully past the top edge

    // 1. draw the bow — small dip down, slow-ish
    await this.track(
      animate(this.position, { y: startY + 30 }, { duration: 0.18, ease: 'easeInOut' }),
    );

    // 2. release — snap off the top
    await this.track(
      animate(
        this.position,
        { y: offTop },
        {
          duration: 0.4,
          ease: [0.5, 0, 0.75, 0], // easeIn-style: starts fast, accelerates out — feels like a launch
        },
      ),
    );
  }

  /** Swaps in a more battered kite and slides it down a 45deg slope; the last life drops it off-screen. */
  public async degrade(livesLeft: number) {
    if (livesLeft <= 0) return this.fall();

    this.stopIdleAnimation();
    this.damage += 1;
    const texture = STAGE_TEXTURES[this.damage];
    if (texture) this.sprite.texture = Texture.from(texture);

    await this.track(
      animate(
        this.position,
        { x: this.restX, y: this.restY },
        { duration: DEGRADE_DURATION_S, ease: 'easeInOut' },
      ),
    );
    if (this.destroyed) return;
    this.startIdleAnimation(); // re-centre the bob on the new resting spot
  }

  /** Pooled screens are reused, so the kite has to come back pristine. */
  public reset() {
    this.stopAnimations();
    this.damage = 0;
    this.airborne = false;
    this.sprite.texture = Texture.from(STAGE_TEXTURES[0]);
    this.alpha = 0;
  }

  public stopAnimations() {
    this.anim?.stop();
    this.anim = undefined;
    this.stopIdleAnimation();
  }

  public pauseIdle() {
    this.idleAnim?.pause();
  }

  public resumeIdle() {
    this.idleAnim?.play();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.stopAnimations();
    super.destroy(options);
  }

  /** Out of lives — hold the 45deg line and carry it clear of the bottom edge. */
  private async fall() {
    this.airborne = false;
    this.stopIdleAnimation();
    const drop = this.screenHeight + this.height / 2 - this.position.y;
    await this.track(
      animate(
        this.position,
        { x: this.position.x + drop, y: this.position.y + drop },
        { duration: FALL_DURATION_S, ease: [0.5, 0, 0.75, 0] },
      ),
    );
  }

  /** How far a single degrade slides the kite, on each axis. */
  private get step() {
    return this.screenHeight * DEGRADE_STEP_RATIO;
  }
  private get restX() {
    return (2 * this.screenWidth) / 3 + this.damage * this.step;
  }
  private get restY() {
    return this.screenHeight / 4 + this.damage * this.step;
  }

  /** A wide, shallow drift around wherever the kite has come to rest. */
  private startIdleAnimation() {
    this.stopIdleAnimation();
    const centerX = this.position.x;
    const centerY = this.position.y;
    const phase = { t: 0 };

    this.idleAnim = animate(
      phase,
      { t: Math.PI * 2 },
      {
        duration: IDLE_DURATION_S,
        ease: 'linear',
        repeat: Infinity,
        onUpdate: () => {
          this.position.x = centerX + Math.cos(phase.t) * IDLE_RADIUS_X;
          this.position.y = centerY + Math.sin(phase.t) * IDLE_RADIUS_Y;
        },
      },
    );
  }

  private stopIdleAnimation() {
    this.idleAnim?.stop();
    this.idleAnim = undefined;
  }

  private async track(controls: AnimationPlaybackControls) {
    this.anim = controls;
    await controls.finished;
  }
}
