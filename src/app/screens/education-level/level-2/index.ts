import { Assets, Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getAlphabet } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import { LetterBubble } from './letter-bubble';

function getThreeUniqueLetters(): [string, string, string] {
  const entries = [...getAlphabet()].sort(() => Math.random() - 0.5);
  return [entries[0].text, entries[1].text, entries[2].text];
}

function endGame() {
  if (++EducationBubbleScreen.rounds < EducationBubbleScreen.MAX_ROUNDS) {
    void engine().navigation.showScreen(EducationBubbleScreen);
  } else {
    EducationBubbleScreen.rounds = 0;
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, 'education');
  }
}

export class EducationBubbleScreen extends Container {
  public static assetBundles = ['education-level-2', 'education-level', 'ui', 'education-audio'];
  public static rounds = 0;
  public static readonly MAX_ROUNDS = 5;

  private background: Sprite;
  private soundButton: SoundButton;
  private hud: HUD;
  private bubbles: LetterBubble[] = [];
  private bubbleContainer = new Container();
  private screenHeight = 0;
  private correctBubbleIndex = 0;
  private correctLetter: string;

  constructor() {
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

    this.background = new Sprite({
      texture: Texture.from('education-level-2/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = new HUD({
      onBack: () => {
        void engine().navigation.showPopup(QuitPopup, {
          type: 'education',
          onQuit: () => {
            void engine().navigation.showScreen(LevelMapScreen, 'education');
          },
        });
      },
      toTutorial: false,
      helpAsset: 'tutorial-popups/education-level-2.png',
      backdropColor: 0x4a90e2,
    });

    let [correctLetter, wrong1, wrong2]: string[] = getThreeUniqueLetters();

    while (!Assets.resolver.hasKey(`${correctLetter}.mp3`)) {
      console.log(`Audio file "${correctLetter}.mp3" missing. Rolling a new set`);

      [correctLetter, wrong1, wrong2] = getThreeUniqueLetters();
    }

    const letters = [correctLetter, wrong1, wrong2].sort(() => Math.random() - 0.5);
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
        new LetterBubble(letter, correctLetter, letter === correctLetter ? endGame : undefined),
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
        i === this.correctBubbleIndex ? endGame : undefined,
      );
    }
  }
  private soundButtonClick() {
    engine().audio.sfx.play(`education-audio/letters/${this.correctLetter}.mp3`);
  }
}
