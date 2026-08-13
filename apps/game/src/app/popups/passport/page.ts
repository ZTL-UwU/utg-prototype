import { Container, Sprite, Text, Texture } from 'pixi.js';

export const PASSPORT_TEXT_COLOR = 0x373a82;

const DEFAULT_EMPTY_ASSET = 'passport/empty-ring.png';
const DEFAULT_COLUMNS = 2;

const SCALE = 1.5;
const SLOT_SIZE = 100 * SCALE;
const SLOT_WIDTH = 150 * SCALE;
const SLOT_GAP = 10 * SCALE;
const TITLE_GAP = 20 * SCALE;

const TITLE_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 32 * SCALE,
  fontWeight: 'bold' as const,
  fill: PASSPORT_TEXT_COLOR,
} as const;

const LABEL_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 24 * SCALE,
  fill: PASSPORT_TEXT_COLOR,
} as const;

export interface PassportPageOptions {
  title: string;
  labels: string[];
  /** Slots per row. Defaults to 2. */
  columns?: number;
  emptyAssetPath?: string;
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function createSlot(label: string, emptyAssetPath: string) {
  const marker = new Sprite({
    texture: Texture.from(emptyAssetPath),
    layout: {
      width: SLOT_SIZE,
      height: SLOT_SIZE,
      objectFit: 'contain',
    },
  });

  return new Container({
    layout: {
      flexDirection: 'column',
      alignItems: 'center',
      width: SLOT_WIDTH,
      gap: SLOT_GAP,
    },
    children: [marker, new Text({ text: label, style: LABEL_STYLE, layout: true })],
  });
}

export class PassportPage extends Container {
  constructor(options: PassportPageOptions) {
    const {
      title,
      labels,
      columns = DEFAULT_COLUMNS,
      emptyAssetPath = DEFAULT_EMPTY_ASSET,
    } = options;

    super({
      layout: {
        flexDirection: 'column',
        flex: 1,
        gap: TITLE_GAP,
      },
    });

    const rows = chunk(labels, columns).map(
      (rowLabels) =>
        new Container({
          layout: {
            flexDirection: 'row',
            width: '100%',
            justifyContent: 'space-evenly',
          },
          children: rowLabels.map((label) => createSlot(label, emptyAssetPath)),
        }),
    );

    // Fills the page
    const grid = new Container({
      layout: {
        flexDirection: 'column',
        width: '100%',
        flex: 1,
        justifyContent: 'space-evenly',
      },
      children: rows,
    });

    this.addChild(new Text({ text: title, style: TITLE_STYLE, layout: true }), grid);
  }
}
