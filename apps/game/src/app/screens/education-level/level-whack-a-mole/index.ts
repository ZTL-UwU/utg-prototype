import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { responsive } from '../../../../engine/utils/viewport';
import { waitFor } from '../../../../engine/utils/waitFor';
import { LetterAudioPlayer } from '../../../../utils/letter-audio';
import useSessionStore from '../../../../zustandStores/sessionStore';
import type { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel, type TLevelOf } from '../../level-map/units';
import { createLetterRows, type LetterRow } from '../level-rounds';
import { MoleTarget } from './mole-target';

/** Holes, each with a mole holding one of the round's letters. */
const MOLE_COUNT = 3;
const MOLE_MOVE_DURATION = 0.3;
const RABBIT_JUMP_DURATION = 0.7;
/** Where the rabbit lands to hit a mole: this far to its side and above it, at the jump's apex this much higher. */
const RABBIT_REACH_X = 118;
const RABBIT_REACH_Y = 105;
const RABBIT_JUMP_HEIGHT = 145;
/** After the hit the rabbit stands this far below the mole's hole. */
const RABBIT_STAND_Y = 58;
/** Seconds the hit stays on screen before the next round. */
const ROUND_END_HOLD = 0.55;
const RABBIT_IDLE = 'education-levels/education-level-whack-a-mole/rabbit-idle.png';
const RABBIT_AIRBORNE = 'education-levels/education-level-whack-a-mole/rabbit-airborne.png';

type MoleCyclePhase = 'idle' | 'waiting' | 'animating';

function easeIn(t: number) {
  return t * t;
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 2;
}

export class EducationWhackAMoleScreen extends Container {
  public readonly screenName = 'EducationWhackAMoleScreen';
  public static assetBundles = [
    'education-level-whack-a-mole',
    'mascots',
    'ui',
    'education-letters-audio',
  ];
  public static loadingBackgroundAsset =
    'education-levels/education-level-whack-a-mole/background-grass.png';
  // TODO: no tutorial asset authored for whack-a-mole yet.
  public static helpAssets: string[] = [];

  private readonly hud: HUD;
  private readonly level: TLevelOf<'education-whack-a-mole'>;
  private readonly background: Sprite;
  private readonly soundButton: SoundButton;
  private readonly targets: MoleTarget[];
  private readonly rabbit: Sprite;
  private readonly rounds: LetterRow[];
  private readonly moleTurnDelayMs: number;
  private readonly initialMoleDelayMs: number;
  private step = 0;
  private hiddenTarget = -1;
  private isResolving = false;
  /** Behind a popup: the moles stop turning. */
  private paused = false;
  private moleCyclePhase: MoleCyclePhase = 'idle';
  private cycleElapsedMs = 0;
  private cycleWaitMs = 0;
  private animLoweringTarget = -1;
  private animRisingTarget = -1;
  private pendingHiddenTarget = -1;
  private readonly letterAudio = new LetterAudioPlayer();
  private rabbitAnimation?: AnimationPlaybackControls;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'education-whack-a-mole');
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });

    engine().audio.bgm.setVolume(0);
    this.level = typedLevel;

    const { letters: letterPool, moleTurnDelayMs, initialMoleDelayMs } = typedLevel.props;
    this.moleTurnDelayMs = moleTurnDelayMs;
    this.initialMoleDelayMs = initialMoleDelayMs;
    this.rounds = createLetterRows(letterPool, MOLE_COUNT);

    this.background = new Sprite({
      texture: Texture.from(`education-levels/education-level-whack-a-mole/background-grass.png`),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });

    this.targets = Array.from(
      { length: MOLE_COUNT },
      (_, index) => new MoleTarget(() => void this.handleTargetPress(index)),
    );

    this.rabbit = new Sprite({
      texture: Texture.from(RABBIT_IDLE),
      anchor: { x: 0.5, y: 1 },
    });

    const soundSize = responsive({ sm: 160, lg: 200 });
    this.soundButton = new SoundButton({
      onClick: () => this.playCurrentAnswerAudio(),
      size: soundSize,
      variant: 'brown',
    });
    this.soundButton.anchor.set(0.5);
    // Matches the sheep-jump level: layout places the anchored center, so the inset includes
    // half the button, and phones tuck it into the corner.
    const soundInset = responsive({ sm: 40, lg: 100 }) + soundSize / 2;
    this.soundButton.layout = { position: 'absolute', bottom: soundInset, right: soundInset };

    this.hud = createLevelHud(typedLevel);

    this.addChild(this.background, ...this.targets, this.rabbit, this.hud, this.soundButton);

    this.positionScene(engine().navigation.width, engine().navigation.height);
    this.startRound();
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.positionScene(width, height);
  }

  public async pause() {
    this.paused = true;
  }

  public async resume() {
    this.paused = false;
  }

  public update(ticker: Ticker) {
    if (this.paused || this.isResolving || this.moleCyclePhase === 'idle') return;

    this.cycleElapsedMs += ticker.deltaMS;

    if (this.moleCyclePhase === 'waiting') {
      if (this.cycleElapsedMs >= this.cycleWaitMs) this.startMoleTurnAnimation();
      return;
    }

    const durationMs = MOLE_MOVE_DURATION * 1000;
    const progress = Math.min(this.cycleElapsedMs / durationMs, 1);

    this.targets[this.animLoweringTarget].setMoleDepth(easeIn(progress));
    if (this.animRisingTarget >= 0) {
      this.targets[this.animRisingTarget].setMoleDepth(1 - easeOut(progress));
    }

    if (progress >= 1) {
      if (this.animRisingTarget >= 0) {
        this.targets[this.animRisingTarget].finishRaising(!this.isResolving);
      }
      this.hiddenTarget = this.pendingHiddenTarget;
      this.beginMoleTurnWait(this.moleTurnDelayMs);
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.stopMoleCycle();
    this.rabbitAnimation?.stop();
    this.rabbitAnimation = undefined;
    this.letterAudio.stop();
    super.destroy(options);
  }

  private positionScene(width: number, height: number) {
    // Phones are too narrow for three holes side by side, so they form a triangle.
    const positions = responsive({
      sm: [
        { x: width * 0.27, y: height * 0.3 },
        { x: width * 0.73, y: height * 0.3 },
        { x: width * 0.5, y: height * 0.52 },
      ],
      lg: [
        { x: width * 0.2, y: height * 0.5 },
        { x: width * 0.5, y: height * 0.4 },
        { x: width * 0.8, y: height * 0.5 },
      ],
    });

    this.targets.forEach((target, index) => {
      target.position.set(positions[index].x, positions[index].y);
    });

    if (!this.isResolving) {
      this.rabbit.texture = Texture.from(RABBIT_IDLE);
      this.rabbit.anchor.set(0.5, 1);
      this.rabbit.position.set(width * 0.5, height * 0.9);
    }
  }

  private startRound() {
    const round = this.rounds[this.step];
    if (!round) return;

    this.isResolving = false;
    this.hiddenTarget = -1;
    this.letterAudio.stop();
    this.targets.forEach((target, index) => {
      target.reset();
      // A pool of fewer letters than holes leaves the spare mole blank.
      target.setLetter(round.letters[index] ?? '');
    });
    this.positionScene(engine().navigation.width, engine().navigation.height);
    this.playCurrentAnswerAudio();
    this.beginMoleTurnWait(this.initialMoleDelayMs);
  }

  private beginMoleTurnWait(delayMs: number) {
    this.moleCyclePhase = 'waiting';
    this.cycleElapsedMs = 0;
    this.cycleWaitMs = delayMs;
  }

  private startMoleTurnAnimation() {
    const nextHidden = (this.hiddenTarget + 1) % this.targets.length;

    this.animLoweringTarget = nextHidden;
    this.animRisingTarget = this.hiddenTarget;
    this.pendingHiddenTarget = nextHidden;
    this.targets[nextHidden].beginLowering();

    this.moleCyclePhase = 'animating';
    this.cycleElapsedMs = 0;
  }

  private stopMoleCycle() {
    this.moleCyclePhase = 'idle';
    this.cycleElapsedMs = 0;
  }

  private async handleTargetPress(index: number) {
    const round = this.rounds[this.step];
    const target = this.targets[index];
    if (!round || !target.isUp || this.isResolving) return;

    if (index !== round.answer) {
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      useSessionStore.getState().recordMistake();
      await target.showWrongFeedback();
      return;
    }

    this.isResolving = true;
    this.stopMoleCycle();
    this.letterAudio.stop();
    this.targets.forEach((item) => item.setEnabled(false));
    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();

    target.showCorrectFeedback();
    await this.playRabbitHit(index);
    await waitFor(ROUND_END_HOLD);
    // The player quit while the rabbit jumped.
    if (this.destroyed) return;

    this.step++;
    if (this.step < this.rounds.length) {
      this.startRound();
      return;
    }
    finishLevel(this, this.level);
  }

  /** The rabbit jumps onto the mole at `index`, which winces, then lands beside its hole. */
  private async playRabbitHit(index: number) {
    const target = this.targets[index];
    const startX = this.rabbit.x;
    const startY = this.rabbit.y - this.rabbit.height / 2;
    const direction = target.x >= startX ? 1 : -1;
    const targetX = target.x - direction * RABBIT_REACH_X;
    const targetY = target.y - RABBIT_REACH_Y;
    const apexY = Math.min(startY, targetY) - RABBIT_JUMP_HEIGHT;

    this.rabbit.texture = Texture.from(RABBIT_AIRBORNE);
    this.rabbit.anchor.set(0.5);
    this.rabbit.scale.set(direction, 1);
    this.rabbit.position.set(startX, startY);

    const jumpAnimation = animate(
      this.rabbit.position,
      {
        x: [startX, (startX + targetX) / 2, targetX],
        y: [startY, apexY, targetY],
      },
      { duration: RABBIT_JUMP_DURATION, ease: ['easeOut', 'easeIn'] },
    );
    this.rabbitAnimation = jumpAnimation;
    await jumpAnimation.finished;
    if (this.rabbitAnimation !== jumpAnimation || this.destroyed) return;

    await target.playImpact(direction);
    if (this.destroyed) return;

    target.hideMole();
    this.rabbit.texture = Texture.from(RABBIT_IDLE);
    this.rabbit.anchor.set(0.5, 1);
    this.rabbit.scale.set(1);
    this.rabbit.position.set(target.x, target.y + RABBIT_STAND_Y);

    const landAnimation = animate(
      this.rabbit.scale,
      { x: [1.08, 0.95, 1], y: [0.88, 1.04, 1] },
      { duration: 0.25, ease: 'easeOut' },
    );
    this.rabbitAnimation = landAnimation;
    await landAnimation.finished;
    if (this.rabbitAnimation === landAnimation) this.rabbitAnimation = undefined;
  }

  private playCurrentAnswerAudio() {
    const round = this.rounds[this.step];
    if (round) this.letterAudio.play(round.letters[round.answer]);
  }
}
