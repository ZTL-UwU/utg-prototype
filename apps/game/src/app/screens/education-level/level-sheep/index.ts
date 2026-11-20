import type { IMediaInstance } from '@pixi/sound';
import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomShuffle } from '../../../../engine/utils/random';
import { responsive } from '../../../../engine/utils/viewport';
import { waitFor } from '../../../../engine/utils/waitFor';
import { LetterAudioPlayer } from '../../../../utils/letter-audio';
import useSessionStore from '../../../../zustandStores/sessionStore';
import type { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel, type TLevelOf } from '../../level-map/units';
import { finishRound, LevelRounds } from '../level-rounds';
import { LetterGrass } from './letter-grass';

// grass slots, matches GRASS_X_RATIOS
const NUM_CHOICES = 3;
const GRASS_X_RATIOS = [0.2, 0.5, 0.8] as const;
const GRASS_Y_RATIO = 0.75;
/** Phones are 768 wide, so the grasses shrink to stay apart. */
const GRASS_SIZE = { sm: 220, lg: 320 };
/** How far beside a grass the sheep stands to eat it. */
const SHEEP_GRASS_OFFSET = { sm: 140, lg: 200 };
/**
 * The sheep's centre stands this far above the grass line. Phones have no room between the
 * grasses for it, so a smaller sheep stands in front of them, below the letter cards.
 */
const SHEEP_ABOVE_GRASS = { sm: -70, lg: 100 };
const SHEEP_SCALE = { sm: 0.6, lg: 1 };
/** How high the happy sheep hops. */
const HOP_HEIGHT = 120;
/** Seconds the sad face stays up after its squash. */
const SAD_HOLD = 0.4;
const SHEEP_TEXTURES = {
  default: 'mascots/sheep/default.png',
  sad: 'mascots/sheep/sad.png',
  grazing: 'mascots/sheep/grazing.png',
  happy: 'mascots/sheep/happy.png',
} as const;

/** Where the sheep stands: beside a grass, on its left (-1) or right (1). */
type SheepSpot = { grass: number; side: -1 | 1 };

export class EducationSheepScreen extends Container {
  public readonly screenName = 'EducationSheepScreen';
  public static assetBundles = [
    'education-level-sheep',
    'ui',
    'mascots',
    'education-letters-audio',
  ];
  public static loadingBackgroundAsset = 'education-levels/education-level-sheep/background.png';
  public static helpAssets = ['tutorial-popups/education-level-sheep.png'];

  private readonly level: TLevelOf<'education-sheep'>;
  private readonly rounds: LevelRounds<string>;
  private background: Sprite;
  private hud: HUD;
  private grasses: LetterGrass[];
  private grassPositions: { x: number; y: number }[] = [];
  private viewWidth = 0;
  private sheep: Sprite;
  /** The sheep starts left of the first grass and moves to whichever is tapped. */
  private sheepSpot: SheepSpot = { grass: 0, side: -1 };
  private soundButton: SoundButton;
  private readonly letterAudio = new LetterAudioPlayer();

  private readonly correctLetter?: string;
  private isAnimating = false;

  constructor(level: TLevel) {
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });
    engine().audio.bgm.setVolume(0);
    this.level = getTypedLevel(level, 'education-sheep');

    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level-sheep/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = createLevelHud(this.level);

    const letterPool = this.level.props.letters;
    this.rounds = LevelRounds.of(this.level, () => randomShuffle([...letterPool]));
    const correctLetter = this.rounds.item;
    this.correctLetter = correctLetter;
    const distractors = randomShuffle(letterPool.filter((letter) => letter !== correctLetter));
    const displayLetters =
      correctLetter === undefined
        ? []
        : randomShuffle([correctLetter, ...distractors.slice(0, NUM_CHOICES - 1)]);

    this.soundButton = new SoundButton({ onClick: () => this.playLetter(), size: 200 });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', left: '50%', top: '20%' };

    this.grasses = displayLetters.map(
      (letter, i) => new LetterGrass(letter, () => this.handleGrassClick(i)),
    );
    this.sheep = new Sprite(Texture.from(SHEEP_TEXTURES.default));
    this.sheep.anchor.set(0.5);

    this.addChild(this.background, ...this.grasses, this.sheep, this.hud, this.soundButton);
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.viewWidth = width;
    const grassY = height * GRASS_Y_RATIO;
    this.grassPositions = GRASS_X_RATIOS.map((xRatio) => ({ x: width * xRatio, y: grassY }));
    const grassSize = responsive(GRASS_SIZE);
    this.grasses.forEach((grass, i) => {
      grass.setSize(grassSize);
      grass.position.set(this.grassPositions[i].x, this.grassPositions[i].y);
    });
    if (!this.isAnimating) this.placeSheep();
  }

  /** Sizes the sheep for this screen and stands it on its spot, keeping the way it faces. */
  private placeSheep() {
    const scale = responsive(SHEEP_SCALE);
    this.sheep.scale.set((Math.sign(this.sheep.scale.x) || 1) * scale, scale);
    this.sheep.position.copyFrom(this.spotPosition(this.sheepSpot));
  }

  /** Where the sheep stands at `spot`, kept fully on screen. */
  private spotPosition({ grass, side }: SheepSpot) {
    const position = this.grassPositions[grass] ?? this.grassPositions[0];
    if (!position) return { x: 0, y: 0 };
    const halfWidth = this.sheep.width / 2;
    const x = position.x + side * responsive(SHEEP_GRASS_OFFSET);
    return {
      x: Math.min(Math.max(halfWidth, x), this.viewWidth - halfWidth),
      y: position.y - responsive(SHEEP_ABOVE_GRASS),
    };
  }

  async show() {
    // A level with no letters has nothing to ask.
    if (this.correctLetter === undefined) {
      finishLevel(this, this.level);
      return;
    }

    const start = this.spotPosition(this.sheepSpot);
    // Walks in from fully off the left edge.
    this.sheep.position.set(-this.sheep.width, start.y);
    void this.playBleatThenLetter();
    await animate(this.sheep.position, start, { duration: 0.8, ease: 'easeOut' });
  }

  /** The sheep bleats as it walks in, then the letter is read out. */
  private async playBleatThenLetter() {
    const bleat: IMediaInstance = await engine().audio.sfx.play(
      'education-levels/education-level-sheep/sheep.mp3',
      { volume: 0.5 },
    );
    bleat.on('end', () => {
      if (!this.destroyed) this.playLetter();
    });
  }

  private playLetter() {
    if (this.correctLetter !== undefined) this.letterAudio.play(this.correctLetter);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.letterAudio.stop();
    super.destroy(options);
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
    await this.moveSheepToGrass(grass);
    await Promise.all([
      this.sheepBounceHappy(),
      grass.correctAnimation(),
      engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3'),
    ]);
    this.isAnimating = false;
    finishRound(this, EducationSheepScreen, this.level, this.rounds);
  }

  private async handleIncorrectLetter(grass: LetterGrass) {
    useSessionStore.getState().recordMistake();
    await this.moveSheepToGrass(grass);
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    await Promise.all([
      this.squashSheep(SHEEP_TEXTURES.grazing, 0.9, 0.9),
      grass.incorrectAnimation().then(() => grass.wilt()),
    ]);
    await this.squashSheep(SHEEP_TEXTURES.sad, 1.1, 0.9, SAD_HOLD);
    this.isAnimating = false;
    // Catch up with any resize skipped while it was busy
    if (!this.destroyed) this.placeSheep();
  }

  /**
   * Squash the sheep to `factorX` × `factorY` of its size and back, wearing `texture` until
   * `hold` seconds after it is done. Keeps the way it faces.
   */
  private async squashSheep(texture: string, factorX: number, factorY: number, hold = 0) {
    const { x, y } = this.sheep.scale;
    const restTexture = this.sheep.texture;
    this.sheep.texture = Texture.from(texture);
    await animate(
      [
        [this.sheep.scale, { x: [x, factorX * x], y: [y, factorY * y] }, { duration: 0.12 }],
        [this.sheep.scale, { x: [factorX * x, x], y: [factorY * y, y] }, { duration: 0.18 }],
      ],
      { defaultTransition: { ease: 'easeInOut' } },
    );
    if (hold > 0) await waitFor(hold);
    if (!this.destroyed) this.sheep.texture = restTexture;
  }

  private async sheepBounceHappy() {
    const { x, y } = this.sheep.scale;
    const restTexture = this.sheep.texture;
    this.sheep.texture = Texture.from(SHEEP_TEXTURES.happy);
    const restY = this.sheep.y;
    await Promise.all([
      animate(
        this.sheep,
        { y: [restY, restY - HOP_HEIGHT, restY] },
        { duration: 0.8, type: 'spring', bounce: 0.3 },
      ),
      animate([
        [this.sheep.scale, { x: [x, 1.5 * x], y: [y, 1.5 * y] }, { duration: 0.2, ease: 'linear' }],
        [this.sheep.scale, { x: [1.5 * x, x], y: [1.5 * y, y] }, { duration: 0.2, ease: 'linear' }],
      ]),
    ]);
    if (!this.destroyed) this.sheep.texture = restTexture;
  }

  /** Walk to the near side of `grass`, facing it. */
  private async moveSheepToGrass(grass: LetterGrass) {
    const index = this.grasses.indexOf(grass);
    const grassX = this.grassPositions[index]?.x ?? 0;
    const side = this.sheep.x > grassX ? 1 : -1;
    this.sheepSpot = { grass: index, side };
    // The art faces right: face left when walking left.
    this.sheep.scale.x = (side === 1 ? -1 : 1) * responsive(SHEEP_SCALE);
    await animate(this.sheep, this.spotPosition(this.sheepSpot), {
      duration: 0.4,
      ease: 'easeOut',
    });
  }
}
