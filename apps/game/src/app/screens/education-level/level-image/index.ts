import { animate } from 'motion';
import { Container, Graphics } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomShuffle } from '../../../../engine/utils/random';
import { responsive } from '../../../../engine/utils/viewport';
import { LetterAudioPlayer } from '../../../../utils/letter-audio';
import {
  levelWordAssets,
  resolveLetterWords,
  type LetterWord,
} from '../../../../zustandStores/wordStore';
import type { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel, type TLevelOf } from '../../level-map/units';
import { finishRound, LevelRounds } from '../level-rounds';
import { WordImageChoice } from './letter-choice';

// image choice slots, matches X_SLOTS
const NUM_CHOICES = 3;
const X_SLOTS = [0.2, 0.5, 0.8];
const CHOICE_Y_RATIO = 0.38;
const PHONE_Y_SLOTS = [0.17, 0.4, 0.63];
/** Phones fit every picture in the same square, so big ones can't cover their neighbours. */
const PHONE_IMAGE_SIZE = 220;
/** How far below its place, and at what share of its size, a choice starts as it pops up. */
const CHOICE_RISE = 80;
const CHOICE_START_SCALE = 0.4;

export class EducationImageScreen extends Container {
  public readonly screenName = 'EducationImageScreen';
  public static assetBundles = ['education-level', 'ui', 'education-letters-audio'];
  public static assets = levelWordAssets('image', 'educationAudio');
  public static loadingBackgroundAsset = 'education-levels/education-level/background.png';
  public static helpAssets = ['tutorial-popups/education-level-image.png'];

  private readonly level: TLevelOf<'education-image'>;
  private readonly rounds: LevelRounds<LetterWord>;
  private background: Graphics;
  private soundButton: SoundButton;
  private hud: HUD;
  private choices: WordImageChoice[] = [];
  private choiceContainer = new Container();
  private readonly correctLetter?: string;
  private readonly letterAudio = new LetterAudioPlayer();

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'education-image');
    super({
      layout: {
        position: 'relative',
        width: '100%',
        height: '100%',
      },
    });
    engine().audio.bgm.setVolume(0);

    this.level = typedLevel;
    this.background = new Graphics();
    this.hud = createLevelHud(typedLevel);

    const words = resolveLetterWords(typedLevel.props.wordIds);
    this.rounds = LevelRounds.of(typedLevel, () => randomShuffle([...words]));
    const correctWord = this.rounds.item;
    const correctLetter = correctWord?.target_letter;
    this.correctLetter = correctLetter;
    const distractors = randomShuffle(
      words.filter((word) => word.target_letter !== correctLetter),
    ).slice(0, NUM_CHOICES - 1);
    const displayWords = correctWord ? randomShuffle([correctWord, ...distractors]) : [];

    this.soundButton = new SoundButton({
      onClick: () => this.playLetter(),
      size: responsive({ sm: 200, lg: 250 }),
      variant: 'large',
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = {
      position: 'absolute',
      left: '50%',
      // Phones move it down to leave room for the stacked choices.
      bottom: responsive<`${number}%`>({ sm: '5%', lg: '20%' }),
    };

    const imageSize = responsive<number | undefined>({ sm: PHONE_IMAGE_SIZE, lg: undefined });
    this.choices = displayWords.map(
      (word) =>
        new WordImageChoice(
          word,
          correctLetter ?? '',
          word.target_letter === correctLetter
            ? () => finishRound(this, EducationImageScreen, this.level, this.rounds)
            : undefined,
          imageSize,
        ),
    );
    for (const choice of this.choices) this.choiceContainer.addChild(choice);
    this.choiceContainer.layout = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    };

    this.addChild(this.background, this.choiceContainer, this.soundButton, this.hud);
    this.playLetter();
  }

  private playLetter() {
    if (this.correctLetter !== undefined) this.letterAudio.play(this.correctLetter);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.letterAudio.stop();
    super.destroy(options);
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    for (let i = 0; i < this.choices.length; i++) {
      const slot = X_SLOTS[i] ?? X_SLOTS[X_SLOTS.length - 1];
      const phoneSlot = PHONE_Y_SLOTS[i] ?? PHONE_Y_SLOTS[PHONE_Y_SLOTS.length - 1];
      // Long words can't share a row on a phone, so the choices stack.
      this.choices[i].x = width * responsive({ sm: 0.5, lg: slot });
      this.choices[i].y = height * responsive({ sm: phoneSlot, lg: CHOICE_Y_RATIO });
    }
    this.background.clear().rect(0, 0, width, height).fill(0xe8eef8);
  }

  public async show() {
    // A level with no playable words has nothing to ask.
    if (this.correctLetter === undefined) {
      finishLevel(this, this.level);
      return;
    }
    await this.animateChoices('in');
  }

  public async hide() {
    await this.animateChoices('out');
  }

  /** The choices pop up into place, staggered, or sink away the same way. */
  private async animateChoices(direction: 'in' | 'out') {
    const entering = direction === 'in';
    const duration = entering ? 0.55 : 0.3;
    const ease = entering ? 'backOut' : 'backIn';
    await Promise.all(
      this.choices.map((choice, i) => {
        const restY = choice.y;
        const restScale = { x: choice.scale.x, y: choice.scale.y };
        const delay = i * (entering ? 0.12 : 0.06);
        const awayY = restY + CHOICE_RISE;
        const awayScale = {
          x: restScale.x * CHOICE_START_SCALE,
          y: restScale.y * CHOICE_START_SCALE,
        };
        if (entering) {
          choice.alpha = 0;
          choice.y = awayY;
          choice.scale.copyFrom(awayScale);
        }
        return Promise.all([
          animate(
            choice,
            { alpha: entering ? 1 : 0, y: entering ? restY : awayY },
            { duration, ease, delay },
          ),
          animate(choice.scale, entering ? restScale : awayScale, { duration, ease, delay }),
        ]);
      }),
    );
  }
}
