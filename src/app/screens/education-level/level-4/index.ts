import { sound } from '@pixi/sound';
import { animate } from 'motion';
import { Container, Graphics } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { pickRandomEducationLetters } from '../../../../utils/example-words';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getLevelType, type TLevel } from '../../level-map/units';
import { LetterChoice } from './letter-choice';

const X_SLOTS = [0.2, 0.5, 0.8];
const CHOICE_Y_RATIO = 0.38;

function endGame(level: TLevel) {
  if (++EducationImageScreen.rounds < EducationImageScreen.MAX_ROUNDS) {
    void engine().navigation.showScreen(EducationImageScreen, level);
  } else {
    EducationImageScreen.rounds = 0;
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level });
  }
}

export class EducationImageScreen extends Container {
  public static assetBundles = [
    'education-level',
    'education-letter-images',
    'ui',
    'education-letters-audio',
  ];
  public static rounds = 0;
  public static readonly MAX_ROUNDS = 5;

  private background: Graphics;
  private soundButton: SoundButton;
  private hud: HUD;
  private choices: LetterChoice[] = [];
  private choiceContainer = new Container();
  private correctLetter: string;
  private isPlaying: boolean = false;

  constructor(level: TLevel) {
    const mapUnit = findMapUnitForLevel(level);
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
          type: getLevelType(level),
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });

    const letters = pickRandomEducationLetters(3);
    letters.sort(() => Math.random() - 0.5);
    this.correctLetter = letters[Math.floor(Math.random() * letters.length)];

    this.soundButton = new SoundButton({
      onClick: () => this.soundButtonClick(),
      size: 250,
      variant: 'large',
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', left: '50%', bottom: '20%' };

    this.choices = letters.map(
      (letter) =>
        new LetterChoice(
          letter,
          this.correctLetter,
          letter === this.correctLetter ? () => endGame(level) : undefined,
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

  public async show() {
    await Promise.all(
      this.choices.map((choice, i) => {
        const targetY = choice.y;
        const targetScaleX = choice.scale.x;
        const targetScaleY = choice.scale.y;
        choice.alpha = 0;
        choice.y = targetY + 80;
        choice.scale.set(targetScaleX * 0.4, targetScaleY * 0.4);
        const delay = i * 0.12;
        return Promise.all([
          animate(choice, { alpha: 1, y: targetY }, { duration: 0.55, ease: 'backOut', delay }),
          animate(
            choice.scale,
            { x: targetScaleX, y: targetScaleY },
            { duration: 0.55, ease: 'backOut', delay },
          ),
        ]);
      }),
    );
  }

  public async hide() {
    await Promise.all(
      this.choices.map((choice, i) => {
        const targetY = choice.y;
        const targetScaleX = choice.scale.x;
        const targetScaleY = choice.scale.y;
        const delay = i * 0.06;
        return Promise.all([
          animate(choice, { alpha: 0, y: targetY + 80 }, { duration: 0.3, ease: 'backIn', delay }),
          animate(
            choice.scale,
            { x: targetScaleX * 0.4, y: targetScaleY * 0.4 },
            { duration: 0.3, ease: 'backIn', delay },
          ),
        ]);
      }),
    );
  }

  private soundButtonClick() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const aliasString: string = `education-levels/education-letters-audio/${this.correctLetter}.mp3`;
    const durationMs = (sound.find(aliasString)?.duration ?? 0) * 1000;
    void engine().audio.sfx.play(aliasString);
    setTimeout(() => {
      this.isPlaying = false;
    }, durationMs);
  }
}
