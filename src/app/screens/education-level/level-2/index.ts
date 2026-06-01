import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getAlphabet } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { BackButton } from '../../../ui/back-button';
import { EndButton } from '../../../ui/end-button';
import { HelpButton } from '../../../ui/help-button';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import { LetterBubble } from './letter-bubble';

function getThreeUniqueLetters(): [string, string, string] {
  const entries = [...getAlphabet()].sort(() => Math.random() - 0.5);
  return [entries[0].text, entries[1].text, entries[2].text];
}

function endGame() {
  const { correct, mistakes } = useSessionStore.getState();
  useScoreManager.getState().addSession(correct, mistakes);
  void engine().navigation.showPopup(EndScreenPopup, 'education');
}

export class EducationBubbleScreen extends Container {
  public static assetBundles = ['education-level-2', 'education-level', 'ui'];

  private background: Sprite;
  private soundButton: SoundButton;
  private backButton: BackButton;
  private helpButton: HelpButton;
  private endButton: EndButton;
  private bubbles: LetterBubble[] = [];
  private bubbleContainer = new Container();
  private screenHeight = 0;
  private correctBubbleIndex = 0;

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
    this.background = new Sprite({
      texture: Texture.from('education-level-2/background.svg'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.backButton = new BackButton(() => {
      void engine().navigation.showPopup(QuitPopup, {
        type: 'education',
        onQuit: () => {
          void engine().navigation.showScreen(LevelMapScreen, 'education');
        },
      });
    });
    this.endButton = new EndButton('education');
    this.helpButton = new HelpButton();
    this.soundButton = new SoundButton({ onClick: () => {}, size: 200 });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', top: '20%', left: '50%' };

    const [correctLetter, wrong1, wrong2] = getThreeUniqueLetters();
    const letters = [correctLetter, wrong1, wrong2].sort(() => Math.random() - 0.5);

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

    this.addChild(
      this.background,
      this.bubbleContainer,
      this.endButton,
      this.helpButton,
      this.soundButton,
      this.backButton,
    );
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
}
