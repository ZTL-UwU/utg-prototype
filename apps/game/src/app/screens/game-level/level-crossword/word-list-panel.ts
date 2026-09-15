import { animate } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

import { getScriptFontFamily } from '../../../../utils/script';

// wide, short bar that sits above the grid; sized for up to ~15 words in 2 rows
const PANEL_WIDTH = 1300;
const PANEL_HEIGHT = 160;
const PANEL_RADIUS = 44;
const PADDING_X = 48;
const TITLE_Y = 30;
const TITLE_FONT_SIZE = 36;
const WORDS_TOP = 56;
const WORDS_BOTTOM = PANEL_HEIGHT - 12;
const WORD_FONT_SIZE = 36;
const WORD_GAP_X = 36;
const ROW_HEIGHT = 46;
const WORDS_AREA_WIDTH = PANEL_WIDTH - PADDING_X * 2;

const WORD_COLOR = 0x1b427a;
const FOUND_COLOR = 0x74a637;

export type WordListPanelOptions = {
  /** Already in the player's script. */
  words: string[];
};

export class WordListPanel extends Container {
  public readonly panelWidth = PANEL_WIDTH;
  public readonly panelHeight = PANEL_HEIGHT;

  private readonly wordsBlock = new Container();
  private readonly wordTexts: Text[] = [];

  constructor({ words }: WordListPanelOptions) {
    super();

    const background = new Graphics()
      .roundRect(0, 16, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS)
      .fill({ color: 0x1b427a, alpha: 0.7 })
      .roundRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS)
      .fill(0xd1dcf0);

    const title = new Text({
      text: 'WORDS',
      resolution: 2,
      anchor: 0.5,
      style: { fontFamily: 'Concert One', fontSize: TITLE_FONT_SIZE, fill: WORD_COLOR },
    });
    title.position.set(PANEL_WIDTH / 2, TITLE_Y);

    this.addChild(background, title, this.wordsBlock);
    this.layoutWords(words);
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
    this.wordsBlock.addChild(strike);
    void animate(strike.scale, { x: 1 }, { duration: 0.3, ease: 'easeOut' });
  }

  /** Flow words into centered rows; shrink the block if the rows overflow the bar. */
  private layoutWords(words: string[]) {
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

    const rows: Text[][] = [];
    let rowWidth = 0;
    texts.forEach((text) => {
      const row = rows[rows.length - 1];
      if (row && rowWidth + WORD_GAP_X + text.width <= WORDS_AREA_WIDTH) {
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
        x += text.width + WORD_GAP_X;
      });
    });

    if (texts.length === 0) return;
    this.wordTexts.push(...texts);
    this.wordsBlock.addChild(...texts);

    const blockHeight = rows.length * ROW_HEIGHT;
    const available = WORDS_BOTTOM - WORDS_TOP;
    const scale = Math.min(1, available / blockHeight, WORDS_AREA_WIDTH / blockWidth);
    this.wordsBlock.scale.set(scale);
    this.wordsBlock.position.set(
      PADDING_X + (WORDS_AREA_WIDTH - blockWidth * scale) / 2,
      WORDS_TOP + (available - blockHeight * scale) / 2,
    );
  }
}
