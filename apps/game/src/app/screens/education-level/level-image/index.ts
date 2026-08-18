import { sound } from '@pixi/sound';
import { animate } from 'motion';
import { Container, Graphics } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomShuffle } from '../../../../engine/utils/random';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import {
  REMOTE_WORDS_BUNDLE,
  resolveWordsByIds,
  type WordSimple,
} from '../../../../zustandStores/wordStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import { getTypedLevel, findMapUnitForLevel, type TLevel } from '../../level-map/units';
import { LetterChoice } from './letter-choice';

// image choice slots, matches X_SLOTS
const NUM_CHOICES = 3;
const X_SLOTS = [0.2, 0.5, 0.8];
const CHOICE_Y_RATIO = 0.38;

function endGame(level: TLevel) {
  if (++EducationImageScreen.rounds < EducationImageScreen.roundOrder.length) {
    void engine().navigation.showScreen(EducationImageScreen, level);
  } else {
    EducationImageScreen.rounds = 0;
    EducationImageScreen.roundOrder = [];
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level });
  }
}

function playableWords(wordIds: number[]): WordSimple[] {
  return resolveWordsByIds(wordIds).filter(
    (word) => word.target_letter != null && word.target_letter.length > 0,
  );
}

export class EducationImageScreen extends Container {
  public static assetBundles = [
    'education-level',
    'ui',
    'education-letters-audio',
    REMOTE_WORDS_BUNDLE,
  ];
  public static splashBackgroundAsset = 'education-levels/education-level/background.png';
  public static helpAssets = ['tutorial-popups/education-level-image.png'];
  public static rounds = 0;
  public static roundOrder: WordSimple[] = [];

  private background: Graphics;
  private soundButton: SoundButton;
  private hud: HUD;
  private choices: LetterChoice[] = [];
  private choiceContainer = new Container();
  private correctLetter: string;
  private isPlaying: boolean = false;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'education-image');
    const mapUnit = findMapUnitForLevel(typedLevel);
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
          mascot: typedLevel.mascot,
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });

    const words = playableWords(typedLevel.props.wordIds);
    if (EducationImageScreen.rounds === 0) {
      EducationImageScreen.roundOrder = randomShuffle([...words]);
    }
    const correctWord = EducationImageScreen.roundOrder[EducationImageScreen.rounds];
    this.correctLetter = correctWord?.target_letter ?? '';
    const distractors = randomShuffle(
      words.filter((word) => word.target_letter !== this.correctLetter),
    ).slice(0, NUM_CHOICES - 1);
    const displayWords = randomShuffle(correctWord ? [correctWord, ...distractors] : distractors);

    this.soundButton = new SoundButton({
      onClick: () => this.soundButtonClick(),
      size: 250,
      variant: 'large',
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', left: '50%', bottom: '20%' };

    this.choices = displayWords.map(
      (word) =>
        new LetterChoice(
          word,
          this.correctLetter,
          word.target_letter === this.correctLetter ? () => endGame(typedLevel) : undefined,
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
      this.choices[i].x = width * (X_SLOTS[i] ?? X_SLOTS[X_SLOTS.length - 1]);
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
    if (this.isPlaying || !this.correctLetter) return;
    this.isPlaying = true;
    const aliasString: string = `education-levels/education-letters-audio/${this.correctLetter}.m4a`;
    const durationMs = (sound.find(aliasString)?.duration ?? 0) * 1000;
    void engine().audio.sfx.play(aliasString);
    setTimeout(() => {
      this.isPlaying = false;
    }, durationMs);
  }
}
