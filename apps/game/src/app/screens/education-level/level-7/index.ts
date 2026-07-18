import { sound } from '@pixi/sound';
import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomShuffle } from '../../../../engine/utils/random';
import { waitFor } from '../../../../engine/utils/waitFor';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getLevelType, type TLevel } from '../../level-map/units';
import { MOLE_UP_Y, MoleTarget } from './mole-target';

const MOLE_DOWN_Y = 220;
const MOLE_MOVE_DURATION = 0.3;
const MOLE_TURN_DELAY_MS = 1200;
const RABBIT_JUMP_DURATION = 0.7;

type MoleCyclePhase = 'idle' | 'waiting' | 'animating';

function easeIn(t: number) {
  return t * t;
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 2;
}

type Round = {
  letters: string[];
  answer: number;
};

function createRound(correctLetter: string, pool: string[]): Round {
  const distractors = randomShuffle<string>(
    pool.filter((letter) => letter !== correctLetter),
  ).slice(0, 2);
  const letters = randomShuffle<string>([correctLetter, ...distractors]);

  return {
    letters,
    answer: letters.indexOf(correctLetter),
  };
}

export class EducationWhackAMoleScreen extends Container {
  public static assetBundles = ['education-level-7', 'mascots', 'ui', 'education-letters-audio'];

  private readonly hud: HUD;
  private readonly level: TLevel;
  private readonly background: Sprite;
  private readonly soundButton: SoundButton;
  private readonly targets: MoleTarget[];
  private readonly rabbit: Sprite;
  private readonly rounds: Round[];
  private step = 0;
  private hiddenTarget = -1;
  private isResolving = false;
  private isPlaying = false;
  private isDestroyed = false;
  private moleCyclePhase: MoleCyclePhase = 'idle';
  private cycleElapsedMs = 0;
  private cycleWaitMs = 0;
  private animLoweringTarget = -1;
  private animRisingTarget = -1;
  private pendingHiddenTarget = -1;
  private audioTimer?: ReturnType<typeof setTimeout>;
  private currentAnswerAudio?: string;
  private rabbitAnimation?: AnimationPlaybackControls;

  constructor(level: TLevel) {
    const mapUnit = findMapUnitForLevel(level);
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });

    engine().audio.bgm.setVolume(0);
    this.level = level;

    const letterPool: string[] = level.props!.letters;
    const orderedLetters = randomShuffle<string>([...letterPool]);
    this.rounds = orderedLetters.map((correctLetter) => createRound(correctLetter, letterPool));

    this.background = new Sprite({
      texture: Texture.from(`education-levels/education-level-7/background-grass.png`),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });

    this.targets = Array.from(
      { length: 3 },
      (_, index) => new MoleTarget(() => void this.handleTargetPress(index)),
    );

    this.rabbit = new Sprite({
      texture: Texture.from(`education-levels/education-level-7/rabbit-idle.png`),
      anchor: { x: 0.5, y: 1 },
    });

    this.soundButton = new SoundButton({
      onClick: () => this.playCurrentAnswerAudio(),
      size: 200,
      variant: 'brown',
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', bottom: 200, right: 200 };

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: getLevelType(level),
          onQuit: () => {
            void engine().navigation.showScreen(LevelMapScreen, mapUnit);
          },
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });

    this.addChild(this.background, ...this.targets, this.rabbit, this.hud, this.soundButton);

    this.positionScene(engine().navigation.width, engine().navigation.height);
    this.startRound();
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.positionScene(width, height);
  }

  public update(ticker: Ticker) {
    if (this.isDestroyed || this.isResolving || this.moleCyclePhase === 'idle') return;

    this.cycleElapsedMs += ticker.deltaMS;

    if (this.moleCyclePhase === 'waiting') {
      if (this.cycleElapsedMs >= this.cycleWaitMs) this.startMoleTurnAnimation();
      return;
    }

    const durationMs = MOLE_MOVE_DURATION * 1000;
    const progress = Math.min(this.cycleElapsedMs / durationMs, 1);

    this.targets[this.animLoweringTarget].molePosition.y =
      MOLE_UP_Y + (MOLE_DOWN_Y - MOLE_UP_Y) * easeIn(progress);

    if (this.animRisingTarget >= 0) {
      this.targets[this.animRisingTarget].molePosition.y =
        MOLE_DOWN_Y + (MOLE_UP_Y - MOLE_DOWN_Y) * easeOut(progress);
    }

    if (progress >= 1) {
      if (this.animRisingTarget >= 0) {
        this.targets[this.animRisingTarget].finishRaising(!this.isResolving);
      }
      this.hiddenTarget = this.pendingHiddenTarget;
      this.beginMoleTurnWait(MOLE_TURN_DELAY_MS);
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.isDestroyed = true;
    this.stopMoleCycle();
    this.rabbitAnimation?.stop();
    this.rabbitAnimation = undefined;
    this.stopAnswerAudio();
    super.destroy(options);
  }

  private positionScene(width: number, height: number) {
    const positions = [
      { x: width * 0.2, y: height * 0.5 },
      { x: width * 0.5, y: height * 0.4 },
      { x: width * 0.8, y: height * 0.5 },
    ];

    this.targets.forEach((target, index) => {
      target.position.set(positions[index].x, positions[index].y);
    });

    if (!this.isResolving) {
      this.rabbit.texture = Texture.from(`education-levels/education-level-7/rabbit-idle.png`);
      this.rabbit.anchor.set(0.5, 1);
      this.rabbit.position.set(width * 0.5, height * 0.9);
    }
  }

  private startRound() {
    const round = this.rounds[this.step];
    if (!round) return;

    this.isResolving = false;
    this.hiddenTarget = -1;
    this.stopAnswerAudio();
    this.targets.forEach((target, index) => {
      target.reset();
      target.setLetter(round.letters[index]);
    });
    this.positionScene(engine().navigation.width, engine().navigation.height);
    this.playCurrentAnswerAudio();
    this.beginMoleTurnWait(700);
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
    this.stopAnswerAudio();
    this.targets.forEach((item) => item.setEnabled(false));
    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();

    target.showCorrectFeedback();
    if (this.isDestroyed) return;
    await this.playRabbitHit(index);
    if (this.isDestroyed) return;
    await waitFor(0.55);
    if (this.isDestroyed) return;

    this.step++;
    if (this.step < this.rounds.length) {
      this.startRound();
      return;
    }

    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }

  private async playRabbitHit(index: number) {
    const target = this.targets[index];
    const sceneScale = target.scale.x;
    const startX = this.rabbit.x;
    const startY = this.rabbit.y - this.rabbit.height / 2;
    const direction = target.x >= startX ? 1 : -1;
    const targetX = target.x - direction * 118 * sceneScale;
    const targetY = target.y - 105 * sceneScale;
    const apexY = Math.min(startY, targetY) - 145 * sceneScale;

    this.rabbit.texture = Texture.from(`education-levels/education-level-7/rabbit-airborne.png`);
    this.rabbit.anchor.set(0.5);
    this.rabbit.scale.set(direction * sceneScale, sceneScale);
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
    if (this.rabbitAnimation !== jumpAnimation || this.isDestroyed) return;

    target.showImpact(direction);
    const hitAnimation = animate(
      target.hitSprite,
      { alpha: 1 },
      { duration: 0.14, ease: 'easeOut' },
    );
    const hitScaleAnimation = animate(
      target.hitSprite.scale,
      { x: direction, y: 1 },
      { duration: 0.22, ease: 'backOut' },
    );
    this.rabbitAnimation = hitAnimation;
    await Promise.all([hitAnimation.finished, hitScaleAnimation.finished]);
    if (this.isDestroyed) return;

    target.hideMole();
    this.rabbit.texture = Texture.from(`education-levels/education-level-7/rabbit-idle.png`);
    this.rabbit.anchor.set(0.5, 1);
    this.rabbit.scale.set(sceneScale);
    this.rabbit.position.set(target.x, target.y + 58 * sceneScale);

    const baseScale = sceneScale;
    const landAnimation = animate(
      this.rabbit.scale,
      {
        x: [baseScale * 1.08, baseScale * 0.95, baseScale],
        y: [baseScale * 0.88, baseScale * 1.04, baseScale],
      },
      { duration: 0.25, ease: 'easeOut' },
    );
    this.rabbitAnimation = landAnimation;
    await landAnimation.finished;
    if (this.rabbitAnimation === landAnimation) this.rabbitAnimation = undefined;
  }

  private playCurrentAnswerAudio() {
    const round = this.rounds[this.step];
    if (!round || this.isPlaying) return;

    this.isPlaying = true;
    const alias = `education-levels/education-letters-audio/${round.letters[round.answer]}.mp3`;
    this.currentAnswerAudio = alias;
    const durationMs = Math.max(250, (sound.find(alias)?.duration ?? 0) * 1000);
    void engine().audio.sfx.play(alias);
    if (this.audioTimer) clearTimeout(this.audioTimer);
    this.audioTimer = setTimeout(() => {
      this.isPlaying = false;
      this.audioTimer = undefined;
    }, durationMs);
  }

  private stopAnswerAudio() {
    if (this.currentAnswerAudio) {
      engine().audio.sfx.stop(this.currentAnswerAudio);
      this.currentAnswerAudio = undefined;
    }
    if (this.audioTimer) clearTimeout(this.audioTimer);
    this.audioTimer = undefined;
    this.isPlaying = false;
  }
}
