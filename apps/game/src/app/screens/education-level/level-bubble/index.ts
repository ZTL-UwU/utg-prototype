import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomFloat, randomShuffle } from '../../../../engine/utils/random';
import { responsive } from '../../../../engine/utils/viewport';
import { LetterAudioPlayer } from '../../../../utils/letter-audio';
import type { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel, type TLevelOf } from '../../level-map/units';
import { finishRound, LevelRounds } from '../level-rounds';
import { getBubbleSize, LetterBubble } from './letter-bubble';

// bubble slots, matches xSlots in resize()
const NUM_CHOICES = 3;
/** How far each bubble's float time may stray from the base, as a share of it. */
const FLOAT_SPEED_SPREAD = 0.15;
/** Latest a bubble may start rising, in seconds. */
const MAX_START_DELAY = 1;
/** Seconds a bubble takes to rise across the screen, before its own spread. */
const FLOAT_DURATION = 15;
/** How far past the screen edges bubbles start and leave, beyond their own radius. */
const FLOAT_START_MARGIN = 20;
const FLOAT_END_MARGIN = 40;

export class EducationBubbleScreen extends Container {
  public readonly screenName = 'EducationBubbleScreen';
  public static assetBundles = ['education-level-bubble', 'ui', 'education-letters-audio'];
  public static loadingBackgroundAsset = 'education-levels/education-level-bubble/background.png';
  public static helpAssets = ['tutorial-popups/education-level-bubble.png'];

  private readonly level: TLevelOf<'education-bubble'>;
  private readonly rounds: LevelRounds<string>;
  private background: Sprite;
  private soundButton: SoundButton;
  private hud: HUD;
  private bubbles: LetterBubble[] = [];
  private bubbleContainer = new Container();
  private screenHeight = 0;
  private correctBubbleIndex = 0;
  private readonly correctLetter?: string;
  private readonly letterAudio = new LetterAudioPlayer();

  constructor(level: TLevel) {
    super({
      layout: {
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
      },
    });
    engine().audio.bgm.setVolume(0);
    this.level = getTypedLevel(level, 'education-bubble');
    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level-bubble/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = createLevelHud(this.level);

    const letterPool = this.level.props.letters;
    this.rounds = LevelRounds.of(this.level, () => randomShuffle([...letterPool]));
    const correctLetter = this.rounds.item;
    this.correctLetter = correctLetter;
    const distractors = randomShuffle(letterPool.filter((letter) => letter !== correctLetter));
    const letters =
      correctLetter === undefined
        ? []
        : randomShuffle([correctLetter, ...distractors.slice(0, NUM_CHOICES - 1)]);

    this.soundButton = new SoundButton({ onClick: () => this.playLetter(), size: 200 });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', top: '20%', left: '50%' };
    this.correctBubbleIndex = correctLetter === undefined ? -1 : letters.indexOf(correctLetter);
    this.bubbles = letters.map(
      (letter) =>
        new LetterBubble(
          letter,
          correctLetter ?? '',
          letter === correctLetter ? this.finishRound : undefined,
        ),
    );
    for (const b of this.bubbles) this.bubbleContainer.addChild(b);
    this.bubbleContainer.layout = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    };

    this.addChild(this.background, this.bubbleContainer, this.soundButton, this.hud);
    this.playLetter();
  }

  private readonly finishRound = () => {
    finishRound(this, EducationBubbleScreen, this.level, this.rounds);
  };

  private playLetter() {
    if (this.correctLetter !== undefined) this.letterAudio.play(this.correctLetter);
  }

  public async pause() {
    for (const bubble of this.bubbles) bubble.pauseFloat();
  }

  public async resume() {
    for (const bubble of this.bubbles) bubble.resumeFloat();
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.screenHeight = height;
    // Phones spread the slots wider so three bubbles fit side by side.
    const xSlots = responsive({ sm: [0.18, 0.5, 0.82], lg: [0.2, 0.5, 0.8] });
    for (let i = 0; i < this.bubbles.length; i++) {
      this.bubbles[i].x = width * xSlots[i];
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.letterAudio.stop();
    super.destroy(options);
  }

  public async show() {
    // A level with no letters has nothing to ask.
    if (this.correctLetter === undefined) {
      finishLevel(this, this.level);
      return;
    }
    for (let i = 0; i < this.bubbles.length; i++) {
      // Start and end fully off screen; bubbles are anchored at their center.
      this.bubbles[i].y = this.screenHeight + getBubbleSize() / 2 + FLOAT_START_MARGIN;
      // Each bubble gets its own speed and start, so they don't rise in a line.
      this.bubbles[i].startFloat(
        -(getBubbleSize() / 2 + FLOAT_END_MARGIN),
        FLOAT_DURATION * randomFloat(1 - FLOAT_SPEED_SPREAD, 1 + FLOAT_SPEED_SPREAD),
        randomFloat(0, MAX_START_DELAY),
        i === this.correctBubbleIndex ? this.finishRound : undefined,
      );
    }
  }
}
