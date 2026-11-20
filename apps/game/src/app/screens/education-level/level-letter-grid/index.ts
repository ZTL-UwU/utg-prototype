import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomShuffle } from '../../../../engine/utils/random';
import type { HUD } from '../../../ui/hud';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel, type TLevelOf } from '../../level-map/units';
import { finishRound, LevelRounds } from '../level-rounds';
import { LetterGrid } from './letter-grid';
import { MessageContainer } from './message-container';

const NUM_CHOICES = 4;

/** Pick the letter heard out of four; each round is a fresh screen. */
export class EducationLetterGridScreen extends Container {
  public readonly screenName = 'EducationLetterGridScreen';
  public static assetBundles = ['education-level', 'ui', 'education-letters-audio'];
  public static loadingBackgroundAsset = 'education-levels/education-level/background.png';
  public static helpAssets = ['tutorial-popups/education-level-letter-grid.png'];

  private readonly level: TLevelOf<'education-letter-grid'>;
  private readonly rounds: LevelRounds<string>;
  private readonly background: Sprite;
  private readonly hud: HUD;
  private readonly letterGrid?: LetterGrid;
  private readonly messageContainer: MessageContainer;

  constructor(level: TLevel) {
    super({
      layout: {
        position: 'relative',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      },
    });
    engine().audio.bgm.setVolume(0);
    this.level = getTypedLevel(level, 'education-letter-grid');
    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = createLevelHud(this.level);

    const letterPool = this.level.props.letters;
    this.rounds = LevelRounds.of(this.level, () => randomShuffle([...letterPool]));
    const correctLetter = this.rounds.item;
    if (correctLetter !== undefined) {
      const distractors = randomShuffle(letterPool.filter((letter) => letter !== correctLetter));
      this.letterGrid = new LetterGrid({
        correctLetter,
        letters: randomShuffle([correctLetter, ...distractors.slice(0, NUM_CHOICES - 1)]),
        onCorrect: () => finishRound(this, EducationLetterGridScreen, this.level, this.rounds),
      });
    }
    this.messageContainer = new MessageContainer();
    this.addChild(
      this.background,
      ...(this.letterGrid ? [this.letterGrid] : []),
      this.hud,
      this.messageContainer,
    );
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.letterGrid?.resize(width, height);
    this.messageContainer.resize(width, height);
  }

  public async show() {
    const grid = this.letterGrid;
    // A level with no letters has nothing to ask.
    if (!grid) {
      finishLevel(this, this.level);
      return;
    }
    grid.alpha = 0;
    grid.scale.set(0.5);
    grid.playLetter();
    await Promise.all([
      animate(grid, { alpha: 1 }, { duration: 0.5, ease: 'backOut' }),
      animate(grid.scale, { x: 1, y: 1 }, { duration: 0.5, ease: 'backOut' }),
    ]);
  }

  public async hide() {
    const grid = this.letterGrid;
    if (!grid) return;
    await Promise.all([
      animate(grid, { alpha: 0 }, { duration: 0.3, ease: 'easeIn' }),
      animate(grid.scale, { x: 0.5, y: 0.5 }, { duration: 0.3, ease: 'easeIn' }),
    ]);
  }
}
