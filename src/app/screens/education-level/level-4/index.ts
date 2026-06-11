import { Assets, Container, Graphics } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getAlphabet } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import { LetterChoice } from './letter-choice';

const X_SLOTS = [0.2, 0.5, 0.8];
const CHOICE_Y_RATIO = 0.38;

function getPlayableLetters(): string[] {
  return getAlphabet()
    .map((entry) => entry.text)
    .filter(
      (letter) =>
        Assets.resolver.hasKey(`${letter}.mp3`) &&
        Assets.resolver.hasKey(`education-letter-images/${letter}.png`),
    );
}

function getThreeUniqueLetters(): [string, string, string] {
  const entries = [...getPlayableLetters()].sort(() => Math.random() - 0.5);
  return [entries[0], entries[1], entries[2]];
}

function endGame() {
  if (++EducationImageScreen.rounds < EducationImageScreen.MAX_ROUNDS) {
    void engine().navigation.showScreen(EducationImageScreen);
  } else {
    EducationImageScreen.rounds = 0;
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, 'education');
  }
}

export class EducationImageScreen extends Container {
  public static assetBundles = [
    'education-level',
    'education-letter-images',
    'ui',
    'education-audio',
  ];
  public static rounds = 0;
  public static readonly MAX_ROUNDS = 5;

  private background: Graphics;
  private soundButton: SoundButton;
  private hud: HUD;
  private choices: LetterChoice[] = [];
  private choiceContainer = new Container();
  private correctLetter: string;

  constructor() {
    super({
      layout: {
        position: 'relative',
        width: '100%',
        height: '100%',
      },
    });
    engine().audio.bgm.setVolume(0);

    this.background = new Graphics();
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: 'education',
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, 'education'),
        }),
      toTutorial: false,
      helpAsset: 'tutorial-popups/education-level-4.png',
      backdropColor: 0x4a90e2,
    });

    let letters: string[] = [];
    let correctLetter = '';

    while (true) {
      letters = getThreeUniqueLetters();
      correctLetter = letters[Math.floor(Math.random() * letters.length)];

      if (Assets.resolver.hasKey(`${correctLetter}.mp3`)) {
        break;
      }
      console.log(`Audio for "${correctLetter}.mp3" is missing. Re-rolling letters...`);
    }

    letters.sort(() => Math.random() - 0.5);
    this.correctLetter = correctLetter;

    this.soundButton = new SoundButton({
      onClick: () => this.soundButtonClick(),
      size: 200,
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', left: '50%', bottom: '12%' };

    this.choices = letters.map(
      (letter) =>
        new LetterChoice(letter, correctLetter, letter === correctLetter ? endGame : undefined),
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
    this.soundButtonClick();
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    for (let i = 0; i < this.choices.length; i++) {
      this.choices[i].x = width * X_SLOTS[i];
      this.choices[i].y = height * CHOICE_Y_RATIO;
    }
    this.background.clear().rect(0, 0, width, height).fill(0xe8eef8);
  }

  private soundButtonClick() {
    engine().audio.sfx.play(`education-audio/letters/${this.correctLetter}.mp3`);
  }
}
