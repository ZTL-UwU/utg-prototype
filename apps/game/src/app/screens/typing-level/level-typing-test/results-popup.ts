import { animate } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getMappedFromKeyCode } from '../../../../utils/keymap';
import { getScriptFontFamily } from '../../../../utils/script';
import { BackButton } from '../../../ui/back-button';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { RetryButton } from '../../../ui/retry-button';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, type TLevel } from '../../level-map/units';

const COLORS = {
  BACKGROUND: 0xfdf3e0,
  PILL: 0xf5e2c4,
  TEXT: 0x6b411e,
  LABEL: 0x8d6241,
  PROBLEM_KEY: 0xef5a42,
  PROBLEM_KEY_TEXT: 0xffffff,
};

const PILL_HEIGHT = 96;
const PILL_RADIUS = 28;
const PILL_PADDING_X = 36;
const PILL_GAP = 20;
const CHIP_SIZE = 72;
const CHIP_RADIUS = 16;
const KEYBOARD_MAX_WIDTH = 1040;
const KEYBOARD_WIDTH_RATIO = 0.72;

// Restated on every resize, so the flex rules survive the new width and height.
const CONTENT_LAYOUT = {
  position: 'absolute',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 28,
} as const;
/** Keys ranked at or above this position get the strong red; the rest a lighter one. */
const PROBLEM_KEY_COUNT = 3;

export type TypingTestResultsPopupProps = {
  level: TLevel;
  durationMs: number;
  correctChars: number;
  mistakes: number;
  mistakesByCode: Map<string, number>;
  onRetry: () => void;
};

function createText(text: string, fontSize: number, fill: number, fontFamily = 'Concert One') {
  return new Text({
    text,
    resolution: 2,
    style: { fontFamily, fontSize, fontWeight: '700', fill },
    anchor: 0.5,
  });
}

/** Label + value on a rounded tan pill, sized to its text. */
function createStatPill(label: string, value: string) {
  const pill = new Container();
  const labelText = createText(label, 40, COLORS.LABEL);
  const valueText = createText(value, 48, COLORS.TEXT);
  const width = labelText.width + valueText.width + PILL_GAP + PILL_PADDING_X * 2;

  const background = new Graphics()
    .roundRect(0, 0, width, PILL_HEIGHT, PILL_RADIUS)
    .fill(COLORS.PILL);
  labelText.position.set(PILL_PADDING_X + labelText.width / 2, PILL_HEIGHT / 2);
  valueText.position.set(width - PILL_PADDING_X - valueText.width / 2, PILL_HEIGHT / 2);

  pill.addChild(background, labelText, valueText);
  pill.layout = { width, height: PILL_HEIGHT, isLeaf: true };
  return pill;
}

function createProblemKeyChip(code: string) {
  const chip = new Container();
  const background = new Graphics()
    .roundRect(0, 0, CHIP_SIZE, CHIP_SIZE, CHIP_RADIUS)
    .fill(COLORS.PROBLEM_KEY);
  const glyph = createText(
    getMappedFromKeyCode(code, false),
    36,
    COLORS.PROBLEM_KEY_TEXT,
    getScriptFontFamily(),
  );
  glyph.position.set(CHIP_SIZE / 2, CHIP_SIZE / 2);

  chip.addChild(background, glyph);
  chip.layout = { width: CHIP_SIZE, height: CHIP_SIZE, isLeaf: true };
  return chip;
}

export class TypingTestResultsPopup extends Container {
  public static assetBundles = ['ui'];

  private readonly innerContainer: Container;
  private readonly keyboard: KeyboardLayout;
  private readonly background: Graphics;
  private readonly content: Container;
  private readonly keyboardSlot: Container;
  private readonly keyboardWidth: number;
  private readonly keyboardHeight: number;

  constructor({
    level,
    durationMs,
    correctChars,
    mistakes,
    mistakesByCode,
    onRetry,
  }: TypingTestResultsPopupProps) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    const attempts = correctChars + mistakes;
    const accuracy = attempts === 0 ? 0 : Math.round((correctChars / attempts) * 100);
    // Standard WPM: five characters count as one word.
    const wpm = durationMs === 0 ? 0 : Math.round(correctChars / 5 / (durationMs / 60_000));

    this.background = new Graphics();

    const title = new Text({
      text: 'Results',
      resolution: 2,
      style: { fontFamily: 'Concert One', fontSize: 72, fontWeight: '700', fill: COLORS.TEXT },
      layout: true,
    });

    const statsRow = new Container({
      layout: { flexDirection: 'row', alignItems: 'center', gap: 24 },
      children: [
        createStatPill('Accuracy', `${accuracy}%`),
        createStatPill('Speed', `${wpm}wpm`),
        createStatPill('Mistakes', String(mistakes)),
      ],
    });

    const rankedCodes = [...mistakesByCode.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code);

    const problemKeysRow = new Container({
      layout: { flexDirection: 'row', alignItems: 'center', gap: 16 },
      children: [
        new Text({
          text: 'Problem keys',
          resolution: 2,
          style: { fontFamily: 'Concert One', fontSize: 44, fontWeight: '700', fill: COLORS.TEXT },
          layout: true,
        }),
        ...rankedCodes.slice(0, PROBLEM_KEY_COUNT).map(createProblemKeyChip),
      ],
    });

    this.keyboard = new KeyboardLayout();
    // The keyboard listens on window from construction; stop it before painting the heatmap,
    // since pausing also clears every key's feedback.
    void this.keyboard.pause();
    void this.keyboard.playEnterAnimation(false);
    rankedCodes.forEach((code, index) => {
      this.keyboard.setKeyFeedback(code, index < PROBLEM_KEY_COUNT ? 'error' : 'error-soft');
    });

    const keyboardBounds = this.keyboard.getLocalBounds();
    this.keyboardWidth = keyboardBounds.width;
    this.keyboardHeight = keyboardBounds.height;
    this.keyboardSlot = new Container({ children: [this.keyboard] });

    this.content = new Container({
      layout: { ...CONTENT_LAYOUT },
      children: [title, statsRow, problemKeysRow, this.keyboardSlot],
    });

    const backButton = new BackButton(() => {
      const mapUnit = findMapUnitForLevel(level);
      void engine()
        .navigation.hidePopup()
        .then(() => engine().navigation.showScreen(LevelMapScreen, mapUnit));
    });
    backButton.scale.set(0.7);
    backButton.layout = { position: 'absolute', left: 90, top: 90 };

    const retryButton = new RetryButton(() => {
      void engine().navigation.hidePopup().then(onRetry);
    });
    retryButton.scale.set(0.8);
    retryButton.layout = { position: 'absolute', right: 90, top: 90 };

    this.innerContainer = new Container({ layout: true });
    this.innerContainer.addChild(this.background, this.content, backButton, retryButton);
    this.addChild(this.innerContainer);
  }

  // The fill is opaque and covers the screen, so this fades rather than scaling a panel in.
  public async show() {
    void engine().audio.sfx.play('preload-audio/sfx/popup.mp3');
    this.innerContainer.alpha = 0;
    await animate(this.innerContainer, { alpha: 1 }, { duration: 0.4, ease: 'easeOut' });
  }

  public async hide() {
    await animate(this.innerContainer, { alpha: 0 }, { duration: 0.2, ease: 'easeOut' });
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.innerContainer.layout = { width, height };

    this.background.clear().rect(0, 0, width, height).fill(COLORS.BACKGROUND);
    this.background.layout = { width, height };
    this.content.layout = { ...CONTENT_LAYOUT, width, height };

    const keyboardScale =
      Math.min(KEYBOARD_MAX_WIDTH, width * KEYBOARD_WIDTH_RATIO) / this.keyboardWidth;
    this.keyboard.scale.set(keyboardScale);
    this.keyboardSlot.layout = {
      width: this.keyboardWidth * keyboardScale,
      height: this.keyboardHeight * keyboardScale,
      isLeaf: true,
    };
  }
}
