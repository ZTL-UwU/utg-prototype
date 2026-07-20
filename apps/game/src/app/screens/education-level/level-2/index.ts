import { sound } from '@pixi/sound';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomShuffle } from '../../../../engine/utils/random';
import { pickRandomEducationLetters } from '../../../../utils/example-words';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getLevelType, type TLevel } from '../../level-map/units';
import { LetterBubble } from './letter-bubble';

// bubble slots, matches xSlots in resize()
const NUM_CHOICES = 3;
// only used when level.props.letters is missing entirely
const FALLBACK_LETTER_COUNT = 8;

export class EducationBubbleScreen extends Container {
  public static assetBundles = [
    'education-level-2',
    'education-level',
    'ui',
    'education-letters-audio',
  ];
  public static helpAssets = ['tutorial-popups/education-level-2.png'];
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
    const aliasString = `education-levels/education-letters-audio/${this.correctLetter}.mp3`;
    const durationMs = (sound.find(aliasString)?.duration ?? 0) * 1000;
    void engine().audio.sfx.play(aliasString);
    setTimeout(() => (this.isPlaying = false), durationMs);
  }
  private level: TLevel;
  constructor(level: TLevel) {
    const mapUnit = findMapUnitForLevel(level);
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
    this.level = level;
    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level-2/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: getLevelType(level),
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });

    const letterPool: string[] =
      level.props?.letters ?? pickRandomEducationLetters(FALLBACK_LETTER_COUNT);
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
    const xSlots = [0.2, 0.5, 0.8];
    for (let i = 0; i < this.bubbles.length; i++) {
      this.bubbles[i].x = width * xSlots[i] - 40;
    }
  }

  public reset() {
    for (const bubble of this.bubbles) bubble.pauseFloat();
  }

  public async show() {
    const FLOAT_DURATION = 10;
    for (let i = 0; i < this.bubbles.length; i++) {
      this.bubbles[i].y = this.screenHeight + 80;
      this.bubbles[i].startFloat(
        -160,
        FLOAT_DURATION,
        i * 0.5,
        i === this.correctBubbleIndex ? this.endGame : undefined,
      );
    }
  }
}
