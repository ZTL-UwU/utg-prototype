import { sound } from '@pixi/sound';
import { animate } from 'motion';
import { Container, Graphics, HTMLText, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomShuffle } from '../../../../engine/utils/random';
import { responsive } from '../../../../engine/utils/viewport';
import { waitFor } from '../../../../engine/utils/waitFor';
import {
  createExampleWordStyle,
  getCompletedWordMarkup,
  getMissingWordMarkup,
} from '../../../../utils/example-words';
import { convertToCurrentScript } from '../../../../utils/script';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import {
  getWordEducationAudioAlias,
  getWordImageAlias,
  playWordAudio,
  levelWordAssets,
  resolveWordsByIds,
  type WordSimple,
} from '../../../../zustandStores/wordStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { LetterChoice } from '../../../ui/letter-choice';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import {
  getTypedLevel,
  findMapUnitForLevel,
  type TLevel,
  type TLevelOf,
} from '../../level-map/units';

const PANEL_RADIUS = 100;
// letter choice slots, matches `choiceX`
const NUM_CHOICES = 3;

/** Panel contents in panel coordinates, before the panel is scaled to the screen. */
type PanelLayout = {
  width: number;
  height: number;
  /** Share of the screen width and height the scaled panel may take up. */
  maxScreenShare: { width: number; height: number };
  image: { x: number; y: number; size: number };
  word: { x: number; y: number; maxWidth: number };
  sound: { x: number; y: number; size: number };
  choiceX: number[];
  choiceY: number;
  choiceSize: number;
};

/** Wide screens: image, word and sound button in a row above the choices. */
const WIDE_LAYOUT: PanelLayout = {
  width: 1500,
  height: 760,
  maxScreenShare: { width: 0.78, height: 0.68 },
  image: { x: 280, y: 220, size: 300 },
  word: { x: 750, y: 220, maxWidth: 760 },
  sound: { x: 1220, y: 220, size: 190 },
  choiceX: [460, 750, 1040],
  choiceY: 590,
  choiceSize: 220,
};

/** Phones: a tall panel stacking image, word, sound button and choices, so little shrinking is needed. */
const PHONE_LAYOUT: PanelLayout = {
  width: 720,
  height: 1180,
  maxScreenShare: { width: 0.92, height: 0.68 },
  image: { x: 360, y: 250, size: 360 },
  word: { x: 360, y: 560, maxWidth: 640 },
  sound: { x: 360, y: 760, size: 150 },
  choiceX: [140, 360, 580],
  choiceY: 990,
  choiceSize: 190,
};

function playableWords(wordIds: number[]): WordSimple[] {
  return resolveWordsByIds(wordIds).filter(
    (word) => word.target_letter != null && word.target_letter.length > 0,
  );
}

function getRound(
  words: WordSimple[],
  correctWord: WordSimple,
): { word: string; letter: string; choices: string[] } {
  const letter = correctWord.target_letter ?? '';
  const distractors = randomShuffle(words.filter((item) => item.target_letter !== letter))
    .slice(0, NUM_CHOICES - 1)
    .map((item) => item.target_letter!)
    .filter(Boolean);

  return {
    word: convertToCurrentScript(correctWord.word.trim()),
    letter,
    choices: randomShuffle([letter, ...distractors]),
  };
}

export class EducationWordScreen extends Container {
  public readonly screenName = 'EducationWordScreen';
  public static assetBundles = ['education-level', 'ui', 'education-letters-audio'];
  public static assets = levelWordAssets('image', 'educationAudio');
  public static loadingBackgroundAsset = 'education-levels/education-level/background.png';
  public static helpAssets = ['tutorial-popups/education-level-word.png'];
  public static rounds = 0;
  private static roundOrder: WordSimple[] = [];

  private readonly background: Sprite;
  private readonly panel: Container;
  private readonly feedback: Text;
  private readonly hud: HUD;
  private readonly soundButton: SoundButton;
  private readonly wordText: HTMLText;
  private readonly choices: LetterChoice[];
  private readonly correctLetter: string;
  private readonly displayLetter: string;
  private readonly correctWordId: number;
  private readonly word: string;
  private isResolving = false;
  private readonly level: TLevelOf<'education-word'>;
  private isPlaying: boolean = false;
  private readonly panelLayout = responsive({ sm: PHONE_LAYOUT, lg: WIDE_LAYOUT });

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'education-word');
    const mapUnit = findMapUnitForLevel(typedLevel);
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });
    engine().audio.bgm.setVolume(0);
    this.level = typedLevel;

    const words = playableWords(typedLevel.props.wordIds);
    if (EducationWordScreen.rounds === 0) {
      EducationWordScreen.roundOrder = randomShuffle([...words]);
    }
    const correctWord = EducationWordScreen.roundOrder[EducationWordScreen.rounds];
    const round = correctWord
      ? getRound(words, correctWord)
      : { word: '', letter: '', choices: [] as string[] };
    this.correctLetter = round.letter;
    this.displayLetter = convertToCurrentScript(round.letter);
    this.correctWordId = correctWord?.id ?? 0;
    this.word = round.word;

    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });

    const layout = this.panelLayout;
    this.panel = new Container();
    this.panel.pivot.set(layout.width / 2, layout.height / 2);
    this.panel.addChild(
      new Graphics()
        .roundRect(0, 16, layout.width, layout.height, PANEL_RADIUS)
        .fill({ color: 0x1b427a, alpha: 0.72 })
        .roundRect(0, 0, layout.width, layout.height, PANEL_RADIUS)
        .fill(0xd1dcf0),
    );

    // `Texture.from` gives nothing for a word whose image failed to load.
    const imageTexture =
      (correctWord ? Texture.from(getWordImageAlias(correctWord.id)) : undefined) ?? Texture.EMPTY;
    const image = new Sprite({ texture: imageTexture, anchor: 0.5 });
    if (imageTexture.width > 0 && imageTexture.height > 0) {
      image.scale.set(layout.image.size / Math.max(imageTexture.width, imageTexture.height));
    }
    image.position.set(layout.image.x, layout.image.y);

    this.wordText = new HTMLText({
      text: getMissingWordMarkup(this.displayLetter, this.word),
      style: createExampleWordStyle(180),
      anchor: 0.5,
    });
    this.wordText.position.set(layout.word.x, layout.word.y);
    this.fitWordText();

    this.soundButton = new SoundButton({
      onClick: () => this.playAudio(),
      size: layout.sound.size,
    });
    this.soundButton.position.set(layout.sound.x, layout.sound.y);

    this.choices = round.choices.map(
      (letter) =>
        new LetterChoice({
          letter,
          size: layout.choiceSize,
          onPress: (choice) => void this.handleChoice(choice),
        }),
    );
    this.choices.forEach((choice, index) => {
      choice.position.set(
        layout.choiceX[index] ?? layout.choiceX[layout.choiceX.length - 1],
        layout.choiceY,
      );
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
          mascot: level.mascot,
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

    const layout = this.panelLayout;
    const panelScale = Math.min(
      1,
      (width * layout.maxScreenShare.width) / layout.width,
      (height * layout.maxScreenShare.height) / layout.height,
    );
    this.panel.scale.set(panelScale);
    this.panel.position.set(Math.round(width / 2), Math.round(height / 2 + 20));

    const panelTop = this.panel.y - (layout.height * panelScale) / 2;
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
    if (this.isPlaying || !this.correctLetter) return;
    this.isPlaying = true;
    const aliasString: string = `education-levels/education-letters-audio/${this.correctLetter}.m4a`;
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
    this.wordText.text = getCompletedWordMarkup(this.displayLetter, this.word);
    this.fitWordText();
    this.feedback.visible = true;
    this.feedback.alpha = 0;
    this.feedback.scale.set(0.65);

    await Promise.all([
      choice.showCorrect(),
      animate(this.feedback, { alpha: 1 }, { duration: 0.35, ease: 'backOut' }),
      animate(this.feedback.scale, { x: 1, y: 1 }, { duration: 0.35, ease: 'backOut' }),
    ]);
    await playWordAudio(getWordEducationAudioAlias(this.correctWordId));
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
    const { maxWidth } = this.panelLayout.word;
    if (this.wordText.width > maxWidth) {
      this.wordText.scale.set(maxWidth / this.wordText.width);
    }
  }
}
