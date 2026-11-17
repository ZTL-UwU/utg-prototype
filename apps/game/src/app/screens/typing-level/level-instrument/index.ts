import { animate } from 'motion';
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { randomShuffle } from '../../../../engine/utils/random';
import { responsive } from '../../../../engine/utils/viewport';
import { m } from '../../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';
import { getTypedText } from '../../../../utils/keymap';
import { getCurrentKeyboardLetters, getScriptFontFamily } from '../../../../utils/script';
import useSessionStore from '../../../../zustandStores/sessionStore';
import type { HUD } from '../../../ui/hud';
import {
  KEY_FEEDBACK_MS,
  KeyboardLayout,
  type KeyboardColorOptions,
} from '../../../ui/keyboard-layout';
import { TypingLetter } from '../../../ui/typing-letter';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel } from '../../level-map/units';

/** Phones fit the four slots across with narrower cards and gaps. */
const SLOT_WIDTH = { sm: 150, lg: 250 };
const SLOT_GAP = { sm: 16, lg: 80 };
const SLOT_HEIGHT = 100;
const SLOT_RADIUS = 16;
/** The queue's top: phones drop it below the corner buttons. */
const QUEUE_TOP = { sm: 170, lg: 36 };
/** Notes shown at a time; each batch of them fills the queue left to right. */
const QUEUE_SIZE = 4;
const TARGET_SIZE = 150;
const SHADOW_OFFSET = 10;
const ENTER_STAGGER_S = 0.08;
const EXIT_STAGGER_S = 0.02;
/** The instrument sits this far left of centre; the target card just left of it. */
const INSTRUMENT_OFFSET_X = { sm: 210, lg: 300 };
const TARGET_OFFSET_X = 66;

const COLORS = {
  queue: 0xa6bbd2,
  success: 0x8ec24d,
  error: 0xef151c,
  shadow: 0x332722,
  white: 0xffffff,
};

const KEYBOARD_COLOR_SCHEME: KeyboardColorOptions = {
  PANEL_COLOR: 0x6080ab,
  PANEL_SHADOW_COLOR: 0xe9ddc8,
  KEY_COLOR: 0xf5f3ef,
  KEY_PRESSED_COLOR: 0xafafaf,
  TEXT_COLOR: 0x495669,
  SHIFT_HINT_COLOR: 0xe8ab27,
};

type NoteCardState = 'default' | 'success' | 'error';

class NoteCard extends Container {
  private readonly shadow = new Graphics();
  private readonly face = new Graphics();
  private readonly noteLabel = new Text({
    text: '',
    resolution: 2,
    style: {
      fill: COLORS.white,
      fontFamily: getScriptFontFamily(),
      fontSize: 42,
      fontWeight: '700',
      padding: 20,
    },
    anchor: 0.5,
  });

  private cardWidth = 0;
  private readonly cardHeight: number;
  private readonly defaultColor: number;
  private state: NoteCardState = 'default';
  private letter = '';

  constructor(height: number, defaultColor: number) {
    super({ layout: { height, flexShrink: 0 } });
    this.cardHeight = height;
    this.defaultColor = defaultColor;
    this.noteLabel.visible = false;
    this.addChild(this.shadow, this.face, this.noteLabel);
  }

  /** Resize the card and redraw it as it is. */
  public setWidth(width: number) {
    this.cardWidth = width;
    this.layout = { width };
    this.noteLabel.position.set(width / 2, this.cardHeight / 2);
    this.setState(this.state, this.letter);
  }

  public setState(state: NoteCardState, letter = '') {
    this.state = state;
    this.letter = letter;
    const color =
      state === 'success' ? COLORS.success : state === 'error' ? COLORS.error : this.defaultColor;

    this.shadow
      .clear()
      .roundRect(SHADOW_OFFSET, SHADOW_OFFSET, this.cardWidth, this.cardHeight, SLOT_RADIUS)
      .fill(COLORS.shadow);
    this.shadow.alpha = 0.72;
    this.face.clear().roundRect(0, 0, this.cardWidth, this.cardHeight, SLOT_RADIUS).fill(color);

    this.noteLabel.text = letter;
    this.noteLabel.visible = state === 'success' && letter !== '';
  }
}

/** `noteCount` notes: the letters in random order, round after round. */
function shuffledNotes(letters: readonly string[], noteCount: number) {
  if (letters.length === 0) return [];

  const result: string[] = [];
  while (result.length < noteCount) {
    result.push(...randomShuffle([...letters]));
  }

  return result.slice(0, noteCount);
}

export class TypingInstrumentScreen extends Container {
  public readonly screenName = 'TypingInstrumentScreen';
  public static assetBundles = ['typing-level-instrument', 'ui'];
  public static loadingBackgroundAsset = 'typing-levels/typing-level-instrument/background.png';
  public static helpAssets = ['tutorial-popups/typing-tutorial.png'];

  private readonly background: Sprite;
  private readonly instrument: Sprite;
  private readonly hud: HUD;
  private readonly keyboard = new KeyboardLayout({ colors: KEYBOARD_COLOR_SCHEME });
  private readonly queue = new Container({
    layout: {
      position: 'absolute',
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
  private readonly targetLabel = new Text({
    text: m.instrument_next_note(),
    resolution: 2,
    style: {
      fill: 0x7e5433,
      fontFamily: DISPLAY_FONT_FAMILY,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: 1,
    },
    anchor: 0.5,
  });
  private target!: TypingLetter;
  private readonly queueCards: NoteCard[];
  private readonly notes: string[];
  private feedbackTimer?: ReturnType<typeof setTimeout>;
  /** A note's feedback that ended behind a popup, run once it closes. */
  private pendingFeedback?: () => void;
  private noteIndex = 0;
  private paused = true;
  private completed = false;
  private awaitingFeedback = false;
  private targetPosition = { x: 0, y: 0 };
  private instrumentRestY = 0;
  private targetLabelRestY = 0;

  private readonly level: TLevel;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'typing-instrument');
    super();
    this.level = typedLevel;
    this.notes = shuffledNotes(getCurrentKeyboardLetters(), typedLevel.props.noteCount);
    this.queueCards = Array.from(
      { length: QUEUE_SIZE },
      () => new NoteCard(SLOT_HEIGHT, COLORS.queue),
    );

    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level-instrument/background.png'),
      layout: { width: '100%', height: '100%', position: 'absolute', objectFit: 'cover' },
    });
    this.instrument = new Sprite({
      texture: Texture.from('typing-levels/typing-level-instrument/instrument.png'),
      anchor: 0.5,
    });

    this.hud = createLevelHud(typedLevel);

    this.queueCards.forEach((card) => this.queue.addChild(card));
    this.addChild(
      this.background,
      this.queue,
      this.instrument,
      this.targetLabel,
      this.keyboard,
      this.hud,
    );
    this.renderNotes();
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.background.layout = { width, height };
    this.keyboard.resize(width, height);
    this.queue.layout = { top: responsive(QUEUE_TOP), gap: responsive(SLOT_GAP) };
    const slotWidth = responsive(SLOT_WIDTH);
    for (const card of this.queueCards) card.setWidth(slotWidth);

    this.instrumentRestY = height * 0.35;
    this.targetLabelRestY = height * 0.25;
    this.instrument.position.set(width / 2 - responsive(INSTRUMENT_OFFSET_X), this.instrumentRestY);
    this.targetLabel.position.set(width / 2 + 10, this.targetLabelRestY);
    this.targetPosition = { x: width / 2 - TARGET_OFFSET_X, y: height * 0.3 };
    this.target?.position.set(this.targetPosition.x, this.targetPosition.y);
  }

  public async show() {
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);

    this.instrument.alpha = 0;
    this.instrument.y = this.instrumentRestY + 80;
    this.targetLabel.alpha = 0;
    this.targetLabel.y = this.targetLabelRestY - 60;
    this.queueCards.forEach((card) => {
      card.alpha = 0;
      card.scale.set(0.85);
    });

    await Promise.all([
      this.keyboard.playEnterAnimation(),
      animate(
        this.instrument,
        { alpha: 1, y: this.instrumentRestY },
        { duration: 0.6, ease: 'easeOut' },
      ),
      animate(
        this.targetLabel,
        { alpha: 1, y: this.targetLabelRestY },
        { duration: 0.4, ease: 'backOut' },
      ),
      ...this.queueCards.flatMap((card, index) => {
        const delay = (QUEUE_SIZE - 1 - index) * ENTER_STAGGER_S;
        return [
          animate(card, { alpha: 1 }, { duration: 0.35, ease: 'backOut', delay }),
          animate(card.scale, { x: 1, y: 1 }, { duration: 0.35, ease: 'backOut', delay }),
        ];
      }),
      this.target?.playAppear(0.15) ?? Promise.resolve(),
    ]);
  }

  public async hide() {
    await this.pause();
    await Promise.all([
      this.keyboard.playExitAnimation(),
      animate(
        this.instrument,
        { alpha: 0, y: this.instrumentRestY + 60 },
        { duration: 0.2, ease: 'easeIn' },
      ),
      animate(
        this.targetLabel,
        { alpha: 0, y: this.targetLabelRestY - 40 },
        { duration: 0.2, ease: 'backIn' },
      ),
      ...this.queueCards.flatMap((card, index) => {
        const delay = (QUEUE_SIZE - 1 - index) * EXIT_STAGGER_S;
        return [
          animate(card, { alpha: 0 }, { duration: 0.2, ease: 'backIn', delay }),
          animate(card.scale, { x: 0.85, y: 0.85 }, { duration: 0.2, ease: 'backIn', delay }),
        ];
      }),
      this.target?.playDisappear(0) ?? Promise.resolve(),
    ]);
  }

  public async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
  }

  public async resume() {
    if (this.completed) return;
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
    const pending = this.pendingFeedback;
    this.pendingFeedback = undefined;
    pending?.();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    clearTimeout(this.feedbackTimer);
    super.destroy(options);
  }

  /** Run `then` once a note's feedback has shown; behind a popup, once the popup closes. */
  private afterFeedback(then: () => void) {
    this.feedbackTimer = setTimeout(() => {
      if (this.paused) this.pendingFeedback = then;
      else then();
    }, KEY_FEEDBACK_MS);
  }

  private renderNotes() {
    const batchStart = Math.floor(this.noteIndex / QUEUE_SIZE) * QUEUE_SIZE;
    const completedInBatch = this.noteIndex - batchStart;
    this.queueCards.forEach((card, index) => {
      const isSuccess = index < completedInBatch;
      const letter = this.notes[batchStart + index] ?? '';
      card.setState(isSuccess ? 'success' : 'default', isSuccess ? letter : '');
    });
    const note = this.notes[this.noteIndex];
    this.setTargetLetter(note ?? '');
    this.keyboard.setHintedLetter(note);
  }

  private setTargetLetter(letter: string) {
    if (this.target) {
      this.removeChild(this.target);
      this.target.destroy({ children: true });
    }
    this.target = new TypingLetter({ letter, cardSize: TARGET_SIZE, cornerRadius: SLOT_RADIUS });
    this.target.setActive(true, false);
    this.target.position.set(this.targetPosition.x, this.targetPosition.y);
    this.addChildAt(this.target, this.getChildIndex(this.keyboard));
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (this.paused || this.completed || this.awaitingFeedback) return;
    const typed = getTypedText(event);
    if (!typed) return;

    if (typed === this.notes[this.noteIndex]) {
      this.handleCorrectNote(event.code);
    } else {
      this.handleIncorrectNote(event.code);
    }
  };

  private handleCorrectNote(code: string) {
    this.awaitingFeedback = true;
    useSessionStore.getState().recordCorrect();
    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    this.keyboard.setKeyFeedback(code, 'success');
    this.target.setFeedback('success');
    this.queueCards[this.noteIndex % QUEUE_SIZE]?.setState(
      'success',
      this.notes[this.noteIndex] ?? '',
    );

    this.afterFeedback(() => {
      this.keyboard.clearKeyFeedback(code);
      this.noteIndex += 1;
      if (this.noteIndex >= this.notes.length) {
        this.endGame();
        return;
      }
      this.renderNotes();
      this.awaitingFeedback = false;
    });
  }

  private handleIncorrectNote(code: string) {
    this.awaitingFeedback = true;
    useSessionStore.getState().recordMistake();
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    this.keyboard.setKeyFeedback(code, 'error');
    this.target.setFeedback('error');

    this.afterFeedback(() => {
      this.keyboard.clearKeyFeedback(code);
      this.target.setFeedback('none', false);
      this.awaitingFeedback = false;
    });
  }

  private endGame() {
    this.completed = true;
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    finishLevel(this, this.level);
  }
}
