import { sound, type IMediaInstance } from '@pixi/sound';
import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, ObservablePoint, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomShuffle } from '../../../../engine/utils/random';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import {
  getTypedLevel,
  findMapUnitForLevel,
  getLevelType,
  type TLevel,
  type TLevelOf,
} from '../../level-map/units';
import { LetterGrass } from './letter-grass';

// grass slots, matches GRASS_X_RATIOS
const NUM_CHOICES = 3;
const GRASS_SIZE = 320;
const SHEEP_GRASS_OFFSET = 200;
const GRASS_X_RATIOS = [0.2, 0.5, 0.8] as const;
const GRASS_Y_RATIO = 0.75;
const SHEEP_TEXTURES = {
  default: 'mascots/sheep/default.png',
  sad: 'mascots/sheep/sad.png',
  grazing: 'mascots/sheep/grazing.png',
  happy: 'mascots/sheep/happy.png',
} as const;

function getGrassPositions(width: number, height: number) {
  const grassY = height * GRASS_Y_RATIO;
  return GRASS_X_RATIOS.map((xRatio) => ({ x: width * xRatio, y: grassY }));
}

function getSheepY(grassY: number) {
  return grassY - 100;
}

function getSheepFacingScale(currentScaleX: number, sheepX: number, targetX: number) {
  const magnitude = Math.abs(currentScaleX) || 1;
  return (sheepX > targetX ? -1 : 1) * magnitude;
}

export class EducationSheepScreen extends Container {
  public static assetBundles = ['education-level-3', 'ui', 'mascots', 'education-letters-audio'];
  public static helpAssets = ['tutorial-popups/education-level-3.png'];
  public static rounds = 0;
  private static roundOrder: string[] = [];

  private background: Sprite;
  private hud: HUD;
  private grasses: LetterGrass[];
  private grassPositions: { x: number; y: number }[] = [];
  private sheep: Sprite;
  private flashSadAnimation?: AnimationPlaybackControls;
  private soundButton: SoundButton;

  private correctLetter: string;
  private isAnimating = false;
  private level: TLevelOf<'education-sheep'>;
  private isPlaying: boolean = false;
  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'education-sheep');
    const mapUnit = findMapUnitForLevel(typedLevel);
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });
    engine().audio.bgm.setVolume(0);
    this.level = typedLevel;

    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level-3/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: getLevelType(typedLevel),
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });

    const letterPool: string[] = typedLevel.props.letters;
    if (EducationSheepScreen.rounds === 0) {
      EducationSheepScreen.roundOrder = randomShuffle<string>([...letterPool]);
    }
    this.correctLetter = EducationSheepScreen.roundOrder[EducationSheepScreen.rounds];
    const distractors = randomShuffle<string>(
      letterPool.filter((letter) => letter !== this.correctLetter),
    ).slice(0, NUM_CHOICES - 1);
    const displayLetters: string[] = randomShuffle<string>([this.correctLetter, ...distractors]);
    this.soundButton = new SoundButton({
      onClick: () => {
        this.soundButtonClick();
      },
      size: 200,
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', left: '50%', top: '20%' };

    this.grasses = displayLetters.map(
      (letter, i) =>
        new LetterGrass(
          letter,
          () => {
            this.handleGrassClick(i);
          },
          GRASS_SIZE,
        ),
    );
    this.sheep = new Sprite(Texture.from(SHEEP_TEXTURES.default));
    this.sheep.anchor.set(0.5);

    this.addChild(this.background, ...this.grasses, this.sheep, this.hud, this.soundButton);
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.grassPositions = getGrassPositions(width, height);
    for (let i = 0; i < this.grasses.length; i++) {
      this.grasses[i].position.set(this.grassPositions[i].x, this.grassPositions[i].y);
    }
  }

  async show() {
    const firstGrass = this.grassPositions[0];
    const startingSheepPosX = firstGrass.x - SHEEP_GRASS_OFFSET;
    const startingSheepPosY = getSheepY(firstGrass.y);
    this.sheep.position.set(-startingSheepPosX, startingSheepPosY);

    await Promise.all([
      animate(
        this.sheep.position,
        { x: startingSheepPosX, y: startingSheepPosY },
        { duration: 0.8, ease: 'easeOut' },
      ),
      (async () => {
        const sfxInstance: IMediaInstance = await engine().audio.sfx.play(
          'education-levels/education-level-3/sheep.mp3',
          { volume: 0.5 },
        );
        sfxInstance.on('end', () => {
          this.soundButtonClick();
        });
      })(),
    ]);
  }

  private soundButtonClick() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const aliasString: string = `education-levels/education-letters-audio/${this.correctLetter}.m4a`;
    const durationMs = (sound.find(aliasString)?.duration ?? 0) * 1000;
    void engine().audio.sfx.play(aliasString);
    setTimeout(() => {
      this.isPlaying = false;
    }, durationMs);
  }

  private readonly handleGrassClick = (clickedGrassIdx: number) => {
    if (this.isAnimating) return;

    this.isAnimating = true;
    const clickedGrass = this.grasses[clickedGrassIdx];
    clickedGrass.setInteractive(false);
    if (clickedGrass.letter === this.correctLetter) void this.handleCorrectLetter(clickedGrass);
    else void this.handleIncorrectLetter(clickedGrass);
  };

  private async handleCorrectLetter(grass: LetterGrass) {
    useSessionStore.getState().recordCorrect();
    await this.moveSheepToGrass(grass)
      .then(async () => {
        await Promise.all([
          this.sheepBounceHappy(this.sheep.scale),
          grass.correctAnimation(),
          engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3'),
        ]);
      })
      .then(() => this.endGame());
  }

  private async handleIncorrectLetter(grass: LetterGrass) {
    useSessionStore.getState().recordMistake();
    await this.moveSheepToGrass(grass)
      .then(async () => {
        void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
        await Promise.all([
          this.sheepFlashGraze(this.sheep.scale), // CURRENT SCALE PASSED TO PRESERVE DIMENSION
          grass.incorrectAnimation().then(() => grass.wilt()),
        ]);
      })
      .then(() => this.sheepFlashSad(this.sheep.scale))
      .then(() => {
        this.isAnimating = false;
      });
  }

  async sheepFlashSad(signedScale: ObservablePoint) {
    const defaultTex = this.sheep.texture;
    this.sheep.texture = Texture.from(SHEEP_TEXTURES.sad);
    this.flashSadAnimation = animate(
      [
        [
          this.sheep.scale,
          { x: [signedScale.x, 1.1 * signedScale.x], y: [signedScale.y, 0.9 * signedScale.y] },
          { duration: 0.12 },
        ],
        [
          this.sheep.scale,
          { x: [1.1 * signedScale.x, signedScale.x], y: [0.9 * signedScale.y, signedScale.y] },
          { duration: 0.18 },
        ],
      ],
      { defaultTransition: { ease: 'easeInOut' } },
    );
    await this.flashSadAnimation.finished;
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        this.sheep.texture = defaultTex;
        resolve();
      }, 400);
    });
  }

  private async sheepFlashGraze(signedScale: ObservablePoint) {
    const defaultTex = this.sheep.texture;
    this.sheep.texture = Texture.from(SHEEP_TEXTURES.grazing);
    await animate(
      [
        [
          this.sheep.scale,
          { x: [signedScale.x, 0.9 * signedScale.x], y: [signedScale.y, 0.9 * signedScale.y] },
          { duration: 0.12 },
        ],
        [
          this.sheep.scale,
          { x: [0.9 * signedScale.x, signedScale.x], y: [0.9 * signedScale.y, signedScale.y] },
          { duration: 0.18 },
        ],
      ],
      { defaultTransition: { ease: 'easeInOut' } },
    ).finished;
    this.sheep.texture = defaultTex;
  }

  private async sheepBounceHappy(signedScale: ObservablePoint) {
    const defaultTex = this.sheep.texture;
    this.sheep.texture = Texture.from(SHEEP_TEXTURES.happy);
    const baseY = this.sheep.y;
    await Promise.all([
      animate(
        this.sheep,
        { y: [baseY, baseY * 1.5, baseY] },
        { duration: 0.8, type: 'spring', bounce: 0.3 },
      ),
      animate([
        [
          this.sheep.scale,
          { x: [signedScale.x, 1.5 * signedScale.x], y: [signedScale.y, 1.5 * signedScale.y] },
          { duration: 0.2, ease: 'linear' },
        ],
        [
          this.sheep.scale,
          { x: [1.5 * signedScale.x, signedScale.x], y: [1.5 * signedScale.y, signedScale.y] },
          { duration: 0.2, ease: 'linear' },
        ],
      ]),
    ]).then(() => (this.sheep.texture = defaultTex));
  }

  private async moveSheepToGrass(grass: LetterGrass) {
    const grassIndex = this.grasses.indexOf(grass);
    const grassPosition = this.grassPositions[grassIndex];
    const sheepY = getSheepY(grassPosition.y);
    const targetX =
      this.sheep.x > grassPosition.x
        ? grassPosition.x + SHEEP_GRASS_OFFSET
        : grassPosition.x - SHEEP_GRASS_OFFSET;

    this.sheep.scale.x = getSheepFacingScale(this.sheep.scale.x, this.sheep.x, grassPosition.x);

    await animate(this.sheep, { x: targetX, y: sheepY }, { duration: 0.4, ease: 'easeOut' })
      .finished;
  }

  private endGame() {
    this.isAnimating = false;
    if (++EducationSheepScreen.rounds < EducationSheepScreen.roundOrder.length) {
      void engine().navigation.showScreen(EducationSheepScreen, this.level);
    } else {
      EducationSheepScreen.rounds = 0;
      EducationSheepScreen.roundOrder = [];
      const { correct, mistakes } = useSessionStore.getState();
      useScoreManager.getState().addSession(correct, mistakes);
      void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
    }
  }
}
