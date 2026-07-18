import { sound, type IMediaInstance } from '@pixi/sound';
import { animate } from 'motion';
import { Container, Graphics, HTMLText, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomShuffle } from '../../../../engine/utils/random';
import { waitFor } from '../../../../engine/utils/waitFor';
import {
  createExampleWordStyle,
  EXAMPLE_WORDS,
  getCompletedWordMarkup,
  getMissingWordMarkup,
} from '../../../../utils/example-words';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { LetterChoice } from '../../../ui/letter-choice';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getLevelType, type TLevel } from '../../level-map/units';

const PANEL_WIDTH = 1500;
const PANEL_HEIGHT = 760;
const PANEL_RADIUS = 100;
const CHOICE_X = [460, 750, 1040];
const CHOICE_Y = 590;
const IMAGE_X = 280;
const WORD_X = 750;
const SOUND_BUTTON_X = 1220;
const WORD_MAX_WIDTH = 760;
// letter choice slots, matches CHOICE_X
const NUM_CHOICES = 3;

function getRound(
  letterPool: string[],
  correctLetter: string,
): { word: string; choices: string[] } {
  const word = EXAMPLE_WORDS.get(correctLetter) ?? '';
  const distractors = randomShuffle<string>(
    letterPool.filter((letter) => letter !== correctLetter),
  ).slice(0, NUM_CHOICES - 1);

  return {
    word,
    choices: randomShuffle<string>([correctLetter, ...distractors]),
  };
}

export class EducationWordScreen extends Container {
  public static assetBundles = [
    'education-level',
    'education-letter-images',
    'ui',
    'education-letters-audio',
    'education-words-audio',
  ];
  public static rounds = 0;
  private static roundOrder: string[] = [];

  private readonly background: Sprite;
  private readonly panel: Container;
  private readonly feedback: Text;
  private readonly hud: HUD;
  private readonly soundButton: SoundButton;
  private readonly wordText: HTMLText;
  private readonly choices: LetterChoice[];
  private readonly correctLetter: string;
  private readonly word: string;
  private isResolving = false;
  private readonly level: TLevel;
  private isPlaying: boolean = false;

  constructor(level: TLevel) {
    const mapUnit = findMapUnitForLevel(level);
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });
    engine().audio.bgm.setVolume(0);
    this.level = level;

    const letterPool: string[] = level.props!.letters;
    if (EducationWordScreen.rounds === 0) {
      EducationWordScreen.roundOrder = randomShuffle<string>([...letterPool]);
    }
    this.correctLetter = EducationWordScreen.roundOrder[EducationWordScreen.rounds];
    const round = getRound(letterPool, this.correctLetter);
    this.word = round.word;

    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });

    this.panel = new Container();
    this.panel.pivot.set(PANEL_WIDTH / 2, PANEL_HEIGHT / 2);
    this.panel.addChild(
      new Graphics()
        .roundRect(0, 16, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS)
        .fill({ color: 0x1b427a, alpha: 0.72 })
        .roundRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS)
        .fill(0xd1dcf0),
    );

    const imageTexture = Texture.from(
      `education-levels/education-letter-images/${this.correctLetter}.png`,
    );
    const image = new Sprite({ texture: imageTexture, anchor: 0.5 });
    image.scale.set(300 / Math.max(imageTexture.width, imageTexture.height));
    image.position.set(IMAGE_X, 220);

    this.wordText = new HTMLText({
      text: getMissingWordMarkup(this.correctLetter, this.word),
      style: createExampleWordStyle(180),
      anchor: 0.5,
    });
    this.wordText.position.set(WORD_X, 220);
    this.fitWordText();

    this.soundButton = new SoundButton({
      onClick: () => this.playAudio(),
      size: 190,
    });
    this.soundButton.position.set(SOUND_BUTTON_X, 220);

    this.choices = round.choices.map(
      (letter) =>
        new LetterChoice({
          letter,
          onPress: (choice) => void this.handleChoice(choice),
        }),
    );
    this.choices.forEach((choice, index) => {
      choice.position.set(CHOICE_X[index], CHOICE_Y);
      this.panel.addChild(choice);
    });

    this.panel.addChild(image, this.wordText, this.soundButton);

    this.feedback = new Text({
      text: 'CORRECT!',
      style: {
        fontFamily: 'Concert One',
        fontSize: 130,
        fontWeight: '800',
        fill: 0xfff7e5,
        stroke: { color: 0x1b427a, width: 8 },
      },
      anchor: 0.5,
    });
    this.feedback.visible = false;

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: getLevelType(level),
          onQuit: () => {
            EducationWordScreen.rounds = 0;
            EducationWordScreen.roundOrder = [];
            void engine().navigation.showScreen(LevelMapScreen, mapUnit);
          },
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });

    this.addChild(this.background, this.panel, this.feedback, this.hud);
    this.playAudio();
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };

    const panelScale = Math.min(1, (width * 0.78) / PANEL_WIDTH, (height * 0.68) / PANEL_HEIGHT);
    this.panel.scale.set(panelScale);
    this.panel.position.set(Math.round(width / 2), Math.round(height / 2 + 20));

    const panelTop = this.panel.y - (PANEL_HEIGHT * panelScale) / 2;
    this.feedback.position.set(width / 2, Math.max(72, panelTop - 78));
  }

  public async show() {
    const targetScale = this.panel.scale.x;
    this.panel.alpha = 0;
    this.panel.scale.set(targetScale * 0.65);

    await Promise.all([
      animate(this.panel, { alpha: 1 }, { duration: 0.55, ease: 'backOut' }),
      animate(
        this.panel.scale,
        { x: targetScale, y: targetScale },
        { duration: 0.55, ease: 'backOut' },
      ),
    ]);
  }

  public async hide() {
    const targetScale = this.panel.scale.x * 0.65;
    await Promise.all([
      animate(this.panel, { alpha: 0 }, { duration: 0.3, ease: 'backIn' }),
      animate(
        this.panel.scale,
        { x: targetScale, y: targetScale },
        { duration: 0.3, ease: 'backIn' },
      ),
    ]);
  }

  private playAudio() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const aliasString: string = `education-levels/education-letters-audio/${this.correctLetter}.mp3`;
    const durationMs = (sound.find(aliasString)?.duration ?? 0) * 1000;
    void engine().audio.sfx.play(aliasString);
    setTimeout(() => (this.isPlaying = false), durationMs);
  }

  private async handleChoice(choice: LetterChoice) {
    if (this.isResolving) return;
    this.isResolving = true;

    if (choice.letter !== this.correctLetter) {
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      useSessionStore.getState().recordMistake();
      await choice.showIncorrect();
      this.isResolving = false;
      return;
    }

    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();
    this.choices.forEach((item) => item.setInteractive(false));
    this.wordText.text = getCompletedWordMarkup(this.correctLetter, this.word);
    this.fitWordText();
    this.feedback.visible = true;
    this.feedback.alpha = 0;
    this.feedback.scale.set(0.65);

    await Promise.all([
      choice.showCorrect(),
      animate(this.feedback, { alpha: 1 }, { duration: 0.35, ease: 'backOut' }),
      animate(this.feedback.scale, { x: 1, y: 1 }, { duration: 0.35, ease: 'backOut' }),
    ]);
    const wordAudioAlias = `education-levels/education-words-audio/${this.correctLetter}.mp3`;
    if (sound.exists(wordAudioAlias)) {
      const audio: IMediaInstance = await engine().audio.sfx.play(wordAudioAlias);
      await new Promise<void>((resolve) => {
        audio.once('end', resolve);
        audio.once('stop', resolve);
      });
    }
    await waitFor(0.65);
    this.endRound();
  }

  private endRound() {
    if (++EducationWordScreen.rounds < EducationWordScreen.roundOrder.length) {
      void engine().navigation.showScreen(EducationWordScreen, this.level);
      return;
    }

    EducationWordScreen.rounds = 0;
    EducationWordScreen.roundOrder = [];
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }

  private fitWordText() {
    this.wordText.scale.set(1);
    if (this.wordText.width > WORD_MAX_WIDTH) {
      this.wordText.scale.set(WORD_MAX_WIDTH / this.wordText.width);
    }
  }
}
