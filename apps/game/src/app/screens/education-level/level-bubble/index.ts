import { sound } from '@pixi/sound';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomFloat, randomShuffle } from '../../../../engine/utils/random';
import { responsive } from '../../../../engine/utils/viewport';
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
  type TLevel,
  type TLevelOf,
} from '../../level-map/units';
import { getBubbleSize, LetterBubble } from './letter-bubble';

// bubble slots, matches xSlots in resize()
const NUM_CHOICES = 3;
/** How far each bubble's float time may stray from the base, as a share of it. */
const FLOAT_SPEED_SPREAD = 0.15;
/** Latest a bubble may start rising, in seconds. */
const MAX_START_DELAY = 1;

export class EducationBubbleScreen extends Container {
  public readonly screenName = 'EducationBubbleScreen';
  public static assetBundles = ['education-level-bubble', 'ui', 'education-letters-audio'];
  public static splashBackgroundAsset = 'education-levels/education-level-bubble/background.png';
  public static helpAssets = ['tutorial-popups/education-level-bubble.png'];
  public static rounds = 0;
  private static roundOrder: string[] = [];

  private background: Sprite;
  private soundButton: SoundButton;
  private hud: HUD;
  private bubbles: LetterBubble[] = [];
  private bubbleContainer = new Container();
  private screenHeight = 0;
  private correctBubbleIndex = 0;
  private correctLetter: string;
  private isPlaying: boolean = false;
  readonly endGame = () => {
    if (++EducationBubbleScreen.rounds < EducationBubbleScreen.roundOrder.length) {
      void engine().navigation.showScreen(EducationBubbleScreen, this.level);
    } else {
      EducationBubbleScreen.rounds = 0;
      EducationBubbleScreen.roundOrder = [];
      const { correct, mistakes } = useSessionStore.getState();
      useScoreManager.getState().addSession(correct, mistakes);
      void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
    }
  };
  private soundButtonClick() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const aliasString = `education-levels/education-letters-audio/${this.correctLetter}.m4a`;
    const durationMs = (sound.find(aliasString)?.duration ?? 0) * 1000;
    void engine().audio.sfx.play(aliasString);
    setTimeout(() => (this.isPlaying = false), durationMs);
  }
  private level: TLevelOf<'education-bubble'>;
  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'education-bubble');
    const mapUnit = findMapUnitForLevel(typedLevel);
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
    this.level = typedLevel;
    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level-bubble/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          mascot: typedLevel.mascot,
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });

    const letterPool: string[] = typedLevel.props.letters;
    if (EducationBubbleScreen.rounds === 0) {
      EducationBubbleScreen.roundOrder = randomShuffle([...letterPool]);
    }
    const correctLetter = EducationBubbleScreen.roundOrder[EducationBubbleScreen.rounds];
    const distractors = randomShuffle<string>(
      letterPool.filter((letter) => letter !== correctLetter),
    ).slice(0, NUM_CHOICES - 1);
    const letters: string[] = randomShuffle<string>([correctLetter, ...distractors]);
    this.soundButton = new SoundButton({
      onClick: () => {
        this.soundButtonClick();
      },
      size: 200,
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', top: '20%', left: '50%' };
    this.correctLetter = correctLetter;
    this.correctBubbleIndex = letters.indexOf(correctLetter);
    this.bubbles = letters.map(
      (letter) =>
        new LetterBubble(
          letter,
          correctLetter,
          letter === correctLetter ? this.endGame : undefined,
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
    this.soundButtonClick();
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

  public reset() {
    for (const bubble of this.bubbles) bubble.pauseFloat();
  }

  public async show() {
    const FLOAT_DURATION = 15;
    for (let i = 0; i < this.bubbles.length; i++) {
      // Start and end fully off screen; bubbles are anchored at their center.
      this.bubbles[i].y = this.screenHeight + getBubbleSize() / 2 + 20;
      // Each bubble gets its own speed and start, so they don't rise in a line.
      this.bubbles[i].startFloat(
        -(getBubbleSize() / 2 + 40),
        FLOAT_DURATION * randomFloat(1 - FLOAT_SPEED_SPREAD, 1 + FLOAT_SPEED_SPREAD),
        randomFloat(0, MAX_START_DELAY),
        i === this.correctBubbleIndex ? this.endGame : undefined,
      );
    }
  }
}
