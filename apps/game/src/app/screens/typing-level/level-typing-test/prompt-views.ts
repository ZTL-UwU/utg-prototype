import type { TypingTestMode, TypingTestProps } from '@utg/level-types';
import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, HTMLText } from 'pixi.js';

import { createTypingSentenceStyle, getSentenceMarkup } from '../../../../utils/example-words';
import { isCurrentScriptRtl } from '../../../../utils/script';
import { TypingLetter } from '../../../ui/typing-letter';
import type { Round } from '../level-word';
import { TypingWordCard } from '../level-word/word-card';
import {
  createLetterSource,
  createSentenceSource,
  createWordSource,
  type PromptSource,
} from './test-content';

const FONT_SIZE = 48;
const PANEL_TEXT_MARGIN = 120;
const LINE_HEIGHT = Math.round(FONT_SIZE * 1.5);
const TEXT_PADDING_Y = 32;
const SCROLL_DURATION_S = 0.25;
const TILE_SIZE = 140;
const TILE_GAP = 40;
const TILE_STAGGER_S = 0.08;
const ERROR_DURATION_MS = 350;

/** Draws one mode's prompt; the screen owns the typed text and the cursor. */
export interface PromptView extends Container {
  /** Shows the next page, row or word and returns the text to type for it. */
  next(): string;
  /** Redraws with the cursor at `activeIdx`, which is always inside the current text. */
  setProgress(activeIdx: number): void;
  /** Flags a wrong key on the current target. */
  showError(): void;
  /** Celebrates the finished item; the next one is shown once this resolves. */
  playComplete?(): Promise<void>;
  /** Fits the view to the prompt panel. */
  place(x: number, y: number, width: number, height: number): void;
}

/**
 * A page of story sentences, completed text dark and the rest gray. A page taller than the
 * panel is clipped to whole lines and scrolls to keep the line being typed in view.
 */
class SentenceView extends Container implements PromptView {
  private readonly source: PromptSource<string>;
  private readonly style = createTypingSentenceStyle(FONT_SIZE);
  private readonly promptText = new HTMLText({ style: this.style });
  /** Never rendered; sizes text with the same style to find where lines break. */
  private readonly measurer = new HTMLText({ style: this.style });
  private readonly viewport = new Container();
  private readonly clip = new Graphics();
  private text = '';
  private activeIdx = 0;
  private totalLines = 0;
  private visibleLines = 1;
  private bandTop = 0;
  private bandHeight = 0;
  private scrollLines = 0;
  private cursorLine = 0;
  /** Word end the cached `cursorLine` was measured for, so the DOM is hit once per word. */
  private measuredWordEnd = -1;
  private scrollAnimation?: AnimationPlaybackControls;

  constructor(source: PromptSource<string>) {
    super();
    this.source = source;
    // A fixed line height makes the line count of any text its height over this.
    this.style.lineHeight = LINE_HEIGHT;
    this.promptText.anchor.set(0.5, 0);
    this.viewport.addChild(this.promptText);
    this.viewport.mask = this.clip;
    this.addChild(this.clip, this.viewport);
  }

  next() {
    this.text = this.source.next();
    this.activeIdx = 0;
    this.totalLines = this.measureLines(this.text);
    this.measuredWordEnd = -1;
    this.followCursor(false);
    return this.text;
  }

  setProgress(activeIdx: number) {
    this.activeIdx = activeIdx;
    this.promptText.text = getSentenceMarkup(this.text, activeIdx);
    this.followCursor(true);
  }

  showError() {}

  place(x: number, y: number, width: number, height: number) {
    this.style.wordWrapWidth = width - PANEL_TEXT_MARGIN;
    this.visibleLines = Math.max(1, Math.floor((height - 2 * TEXT_PADDING_Y) / LINE_HEIGHT));
    this.bandHeight = this.visibleLines * LINE_HEIGHT;
    this.bandTop = y + (height - this.bandHeight) / 2;
    this.clip.clear().rect(x, this.bandTop, width, this.bandHeight).fill(0xffffff);
    this.promptText.x = x + width / 2;

    // A new wrap width moves every line break.
    this.totalLines = this.measureLines(this.text);
    this.measuredWordEnd = -1;
    this.followCursor(false);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.scrollAnimation?.stop();
    this.measurer.destroy();
    super.destroy(options);
  }

  /** Scrolls so one finished line stays above the cursor, never past the last line. */
  private followCursor(animated: boolean) {
    const context = Math.min(1, this.visibleLines - 1);
    const maxScroll = Math.max(0, this.totalLines - this.visibleLines);
    const scrollLines = Math.min(Math.max(this.lineOfCursor() - context, 0), maxScroll);
    if (animated && scrollLines === this.scrollLines) return;

    this.scrollLines = scrollLines;
    this.scrollAnimation?.stop();
    const y = this.textTop();
    if (!animated) {
      this.promptText.y = y;
      return;
    }
    this.scrollAnimation = animate(
      this.promptText,
      { y },
      { duration: SCROLL_DURATION_S, ease: 'easeOut' },
    );
  }

  private textTop(): number {
    // A page that fits is centred in the band, as before scrolling existed.
    if (this.totalLines <= this.visibleLines) {
      return this.bandTop + (this.bandHeight - this.totalLines * LINE_HEIGHT) / 2;
    }
    return this.bandTop - this.scrollLines * LINE_HEIGHT;
  }

  /**
   * Wrapping is greedy, so the text up to the end of the current word breaks exactly as it
   * does inside the full page; its line count is the cursor's line. A cursor on a space
   * belongs to the line before, where the browser hangs that space.
   */
  private lineOfCursor(): number {
    const spaceIdx = this.text.indexOf(' ', this.activeIdx);
    const wordEnd = spaceIdx === -1 ? this.text.length : spaceIdx;
    if (wordEnd !== this.measuredWordEnd) {
      this.measuredWordEnd = wordEnd;
      this.cursorLine = Math.max(0, this.measureLines(this.text.slice(0, wordEnd)) - 1);
    }
    return this.cursorLine;
  }

  private measureLines(text: string): number {
    if (!text) return 0;
    this.measurer.text = text;
    return Math.round(this.measurer.height / LINE_HEIGHT);
  }
}

/** A row of letter tiles; typed tiles stay green and focus moves straight on. */
class LetterTilesView extends Container implements PromptView {
  private readonly source: PromptSource<string[]>;
  private readonly rtl = isCurrentScriptRtl();
  /** In typing order, which for right-to-left scripts is right to left on screen. */
  private tiles: TypingLetter[] = [];
  /** Text offset just past each tile, so a cursor maps to its tile. */
  private tileEnds: number[] = [];
  private activeTile = 0;

  constructor(source: PromptSource<string[]>) {
    super({
      layout: {
        position: 'absolute',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: TILE_GAP,
      },
    });
    this.source = source;
  }

  next() {
    this.removeChildren();
    for (const tile of this.tiles) tile.destroy({ children: true });

    const letters = this.source.next();
    let end = 0;
    this.tileEnds = letters.map((letter) => (end += letter.length));
    this.tiles = letters.map((letter) => new TypingLetter({ letter, cardSize: TILE_SIZE }));
    this.activeTile = 0;
    if (this.tiles.length === 0) return '';

    this.tiles[0].setActive(true, false);
    this.addChild(...(this.rtl ? [...this.tiles].reverse() : this.tiles));
    void Promise.all(this.tiles.map((tile, index) => tile.playAppear(index * TILE_STAGGER_S)));
    return letters.join('');
  }

  setProgress(activeIdx: number) {
    const target = this.tileEnds.findIndex((tileEnd) => tileEnd > activeIdx);
    while (this.activeTile < target) {
      const done = this.tiles[this.activeTile];
      done.setActive(false);
      done.setFeedback('success', true);
      this.activeTile += 1;
    }
    this.tiles[this.activeTile]?.setActive(true);
  }

  showError() {
    this.tiles[this.activeTile]?.setFeedback('error', true);
  }

  place(x: number, y: number, width: number, height: number) {
    this.layout = { left: x, top: y, width, height };
  }
}

/** One word on its card, beside the word's image when it has one. */
class WordImageView extends TypingWordCard implements PromptView {
  private readonly source: PromptSource<Round | undefined>;
  private errorTimeout?: number;

  constructor(source: PromptSource<Round | undefined>) {
    super();
    this.source = source;
  }

  next() {
    const round = this.source.next();
    if (!round) return '';
    this.setRound(round);
    return round.word;
  }

  showError() {
    window.clearTimeout(this.errorTimeout);
    this.setFeedback('error');
    this.errorTimeout = window.setTimeout(() => this.setFeedback('default'), ERROR_DURATION_MS);
  }

  playComplete() {
    // A pending error reset would otherwise cut the green flash short.
    window.clearTimeout(this.errorTimeout);
    return this.playSuccessFlash();
  }

  place(x: number, y: number, width: number, height: number) {
    this.layout = { position: 'absolute', left: x, top: y, width, height };
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.clearTimeout(this.errorTimeout);
    super.destroy(options);
  }
}

export function createPromptView(mode: TypingTestMode, props: TypingTestProps): PromptView {
  if (mode === 'letters') return new LetterTilesView(createLetterSource(props));
  if (mode === 'words') return new WordImageView(createWordSource(props));
  return new SentenceView(createSentenceSource(props));
}
