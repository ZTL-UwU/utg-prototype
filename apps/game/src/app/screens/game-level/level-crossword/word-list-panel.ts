import { animate } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

import { m } from '../../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';
import { getScriptFontFamily } from '../../../../utils/script';

// wide, short bar that sits above the grid; sized for up to ~15 words in 2 rows
export const LIST_WIDTH = 1300;
export const LIST_HEIGHT = 160;
const PANEL_RADIUS = 44;
const PADDING_X = 48;
const TITLE_Y = 30;
const TITLE_FONT_SIZE = 36;
const WORDS_TOP = 56;
const WORDS_BOTTOM_MARGIN = 12;
const WORD_FONT_SIZE = 36;
const WORD_GAP_X = 36;
const ROW_HEIGHT = 46;
/** A panel taller than the bar has height to spare, so the words can grow into it. */
const MAX_WORDS_SCALE = 1.5;

const WORD_COLOR = 0x1b427a;
const FOUND_COLOR = 0x74a637;

export type WordListPanelOptions = {
  /** Already in the player's script. */
  words: string[];
};

export class WordListPanel extends Container {
  public panelWidth = LIST_WIDTH;
  public panelHeight = LIST_HEIGHT;

  private readonly background = new Graphics();
  private readonly title: Text;
  private readonly wordsBlock = new Container();
  private readonly wordTexts: Text[] = [];
  private readonly strikes = new Map<Text, Graphics>();

  constructor({ words }: WordListPanelOptions) {
    super();

    this.title = new Text({
      text: m.word_search_words(),
      resolution: 2,
      anchor: 0.5,
      style: { fontFamily: DISPLAY_FONT_FAMILY, fontSize: TITLE_FONT_SIZE, fill: WORD_COLOR },
    });

    this.addChild(this.background, this.title, this.wordsBlock);
    this.createWords(words);
    this.drawPanel();
  }

  /** Redraw the panel at this size and reflow the words into it. */
  public setSize(width: number, height: number) {
    if (this.panelWidth === width && this.panelHeight === height) return;
    this.panelWidth = width;
    this.panelHeight = height;
    this.drawPanel();
  }

  private drawPanel() {
    const { panelWidth: width, panelHeight: height } = this;
    this.background
      .clear()
      .roundRect(0, 16, width, height, PANEL_RADIUS)
      .fill({ color: 0x1b427a, alpha: 0.7 })
      .roundRect(0, 0, width, height, PANEL_RADIUS)
      .fill(0xd1dcf0);
    this.title.position.set(width / 2, TITLE_Y);
    this.layoutWords();
  }

  public markFound(index: number) {
    const text = this.wordTexts[index];
    if (!text) return;

    text.style.fill = FOUND_COLOR;
    const strike = new Graphics()
      .moveTo(-text.width / 2 - 8, 0)
      .lineTo(text.width / 2 + 8, 0)
      .stroke({ color: FOUND_COLOR, width: 5, cap: 'round' });
    strike.position.copyFrom(text.position);
    strike.scale.x = 0;
    this.strikes.set(text, strike);
    this.wordsBlock.addChild(strike);
    void animate(strike.scale, { x: 1 }, { duration: 0.3, ease: 'easeOut' });
  }

  private createWords(words: string[]) {
    const texts = words.map(
      (word) =>
        new Text({
          text: word,
          resolution: 2,
          anchor: 0.5,
          style: {
            fontFamily: getScriptFontFamily(),
            fontSize: WORD_FONT_SIZE,
            fontWeight: '700',
            fill: WORD_COLOR,
            padding: 20,
          },
        }),
    );

    if (texts.length === 0) return;
    this.wordTexts.push(...texts);
    this.wordsBlock.addChild(...texts);
  }

  /** Flow words into centered rows; shrink the block if the rows overflow the panel. */
  private layoutWords() {
    const texts = this.wordTexts;
    if (texts.length === 0) return;

    const areaWidth = this.panelWidth - PADDING_X * 2;
    const maxScale = this.panelHeight > LIST_HEIGHT ? MAX_WORDS_SCALE : 1;
    // Flowed narrower than the panel when the block will be scaled up to fill it.
    const flowWidth = areaWidth / maxScale;
    const rows: Text[][] = [];
    let rowWidth = 0;
    texts.forEach((text) => {
      const row = rows[rows.length - 1];
      if (row && rowWidth + WORD_GAP_X + text.width <= flowWidth) {
        row.push(text);
        rowWidth += WORD_GAP_X + text.width;
      } else {
        rows.push([text]);
        rowWidth = text.width;
      }
    });

    const widthOf = (row: Text[]) =>
      row.reduce((sum, text) => sum + text.width, 0) + WORD_GAP_X * (row.length - 1);
    const blockWidth = Math.max(0, ...rows.map(widthOf));
    rows.forEach((row, rowIndex) => {
      let x = (blockWidth - widthOf(row)) / 2;
      row.forEach((text) => {
        text.position.set(x + text.width / 2, ROW_HEIGHT * (rowIndex + 0.5));
        this.strikes.get(text)?.position.copyFrom(text.position);
        x += text.width + WORD_GAP_X;
      });
    });

    const blockHeight = rows.length * ROW_HEIGHT;
    const available = this.panelHeight - WORDS_BOTTOM_MARGIN - WORDS_TOP;
    const scale = Math.min(maxScale, available / blockHeight, areaWidth / blockWidth);
    this.wordsBlock.scale.set(scale);
    this.wordsBlock.position.set(
      PADDING_X + (areaWidth - blockWidth * scale) / 2,
      WORDS_TOP + (available - blockHeight * scale) / 2,
    );
  }
}
