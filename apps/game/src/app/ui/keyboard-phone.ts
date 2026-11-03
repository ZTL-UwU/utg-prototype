import type { TargetScript } from '@utg/script-converter';
import { Container, Graphics, Text } from 'pixi.js';

import { getFontFamilyForScript } from '../../utils/script';

export type KeyFeedback = 'none' | 'hint' | 'error' | 'error-soft' | 'success';

export type PhoneKeyKind = 'char' | 'shift' | 'backspace' | 'enter' | 'space';

export type PhoneKeyDef = {
  kind: PhoneKeyKind;
  /** Character a `char` key types. */
  glyph?: string;
  /** Characters offered by a long press, like Gboard's accent popup. */
  alternates?: string[];
  /** Width in key pitches. */
  width?: number;
};

/**
 * `'a b e:é'` → char keys; text after `:` lists the long-press alternates, comma-separated.
 * A colon is never a key here, so it is free to use as the separator.
 */
function chars(spec: string, width?: number): PhoneKeyDef[] {
  return spec.split(' ').map((token) => {
    const [glyph, alternates] = token.split(':');
    return { kind: 'char', glyph, alternates: alternates?.split(','), width };
  });
}

const backspace = (width?: number): PhoneKeyDef => ({ kind: 'backspace', width });

/** Gboard's bottom row, minus the symbol, emoji and cursor keys the game has no use for. */
function bottomRow(comma: string, period: string, spaceWidth: number): PhoneKeyDef[] {
  return [
    ...chars(comma, 1.5),
    { kind: 'space', width: spaceWidth },
    ...chars(period, 1.5),
    { kind: 'enter', width: 2 },
  ];
}

/** Gboard Uyghur: every letter on its own key, so there is no Shift. */
const ARABIC_ROWS: PhoneKeyDef[][] = [
  chars('چ ۋ ې ژ ر ت ي ۇ ڭ و پ:ف'),
  chars('ھ س د ا ە ى ق ك ل:لا گ ۆ'),
  [...chars('ز ش غ ۈ ب ن م خ ج ئ'), backspace()],
  bottomRow('،', '.', 6),
];

/** The Arabic grid in Cyrillic letters, matching the phonetic physical layout; ф takes ئ's key. */
const CYRILLIC_ROWS: PhoneKeyDef[][] = [
  chars('ч в е ж р т й у ң о п'),
  chars('һ с д а ә и қ к л г ө'),
  [...chars('з ш ғ ү б н м х җ ф'), backspace()],
  bottomRow(',', '.', 6),
];

/** Gboard QWERTY; ULY's é, ö, ü hide behind e, o, u, and the hamza apostrophe behind the period. */
const LATIN_ROWS: PhoneKeyDef[][] = [
  chars('q w e:é r t y u:ü i o:ö p'),
  chars('a s d f g h j k l'),
  [{ kind: 'shift', width: 1.5 }, ...chars('z x c v b n m'), backspace(1.5)],
  bottomRow(',', ".:'", 5),
];

export function getPhoneRows(script: TargetScript): PhoneKeyDef[][] {
  switch (script) {
    case 'Latin':
      return LATIN_ROWS;
    case 'Cyrillic':
      return CYRILLIC_ROWS;
    default:
      return ARABIC_ROWS;
  }
}

export type PhoneKeyColors = {
  keyColor: number;
  keyPressedColor: number;
  textColor: number;
  hintColor: number;
};

export const KEY_SUCCESS_COLOR = 0x8ec24d;
export const KEY_ERROR_COLOR = 0xef5a42;
// Lighter red so a heatmap can rank problem keys against the worst ones.
export const KEY_ERROR_SOFT_COLOR = 0xf6907c;

export function keyFillColor(
  feedback: KeyFeedback,
  pressed: boolean,
  keyColor: number,
  keyPressedColor: number,
) {
  switch (feedback) {
    case 'success':
      return KEY_SUCCESS_COLOR;
    case 'error':
      return KEY_ERROR_COLOR;
    case 'error-soft':
      return KEY_ERROR_SOFT_COLOR;
    case 'hint':
      return keyPressedColor;
    default:
      return pressed ? keyPressedColor : keyColor;
  }
}

export type ShiftState = 'off' | 'once' | 'locked';

const PHONE_KEY_RADIUS = 10;
// Gboard tints Shift, Backspace, Enter and punctuation darker than letters; over the game's
// panel a translucent key reads as the same kind of step.
const FUNCTION_KEY_ALPHA = 0.7;
const ALTERNATE_FONT_SIZE = 18;
const ALTERNATE_INSET = 7;
const ICON_STROKE = 3;

export class PhoneKeyCap extends Container {
  public readonly def: PhoneKeyDef;
  public keyWidth = 0;
  public keyHeight = 0;

  private readonly background = new Graphics();
  private readonly icon = new Graphics();
  private readonly glyphLabel?: Text;
  private readonly alternateLabel?: Text;
  private readonly colors: PhoneKeyColors;
  private readonly isFunctionKey: boolean;
  private readonly rtl: boolean;
  private pressed = false;
  private keyFeedback: KeyFeedback = 'none';
  private shiftState: ShiftState = 'off';

  constructor(def: PhoneKeyDef, script: TargetScript, colors: PhoneKeyColors, fontSize: number) {
    super();
    this.def = def;
    this.colors = colors;
    this.rtl = script === 'Arabic';
    this.isFunctionKey = def.kind !== 'char' || !/\p{L}/u.test(def.glyph ?? '');

    this.addChild(this.background);
    if (def.kind === 'char') {
      this.glyphLabel = new Text({
        text: def.glyph ?? '',
        resolution: 2,
        style: {
          fill: colors.textColor,
          fontFamily: getFontFamilyForScript(script),
          fontSize,
          fontWeight: '700',
          padding: 20,
        },
        anchor: 0.5,
      });
      this.addChild(this.glyphLabel);

      if (def.alternates?.length) {
        this.alternateLabel = new Text({
          text: def.alternates[0],
          resolution: 2,
          style: {
            fill: colors.hintColor,
            fontFamily: getFontFamilyForScript(script),
            fontSize: ALTERNATE_FONT_SIZE,
            fontWeight: '700',
            padding: 10,
          },
          anchor: { x: 1, y: 0 },
        });
        this.addChild(this.alternateLabel);
      }
    } else {
      this.addChild(this.icon);
    }
  }

  public applySize(keyWidth: number, keyHeight: number) {
    this.keyWidth = keyWidth;
    this.keyHeight = keyHeight;
    this.glyphLabel?.position.set(keyWidth / 2, keyHeight / 2);
    this.alternateLabel?.position.set(keyWidth - ALTERNATE_INSET, ALTERNATE_INSET / 2);
    this.icon.position.set(keyWidth / 2, keyHeight / 2);
    this.drawBackground();
    this.drawIcon();
  }

  /** Letters follow Shift and Caps Lock; caseless scripts are unaffected. */
  public setUpperCase(upper: boolean) {
    if (!this.glyphLabel || !this.def.glyph) return;
    const caseOf = (text: string) =>
      upper ? text.toLocaleUpperCase('ug') : text.toLocaleLowerCase('ug');
    this.glyphLabel.text = caseOf(this.def.glyph);
    if (this.alternateLabel && this.def.alternates) {
      this.alternateLabel.text = caseOf(this.def.alternates[0]);
    }
  }

  public setPressed(pressed: boolean) {
    if (this.pressed === pressed) return;
    this.pressed = pressed;
    this.drawBackground();
  }

  public get feedback() {
    return this.keyFeedback;
  }

  public setFeedback(feedback: KeyFeedback) {
    if (this.keyFeedback === feedback) return;
    this.keyFeedback = feedback;
    this.drawBackground();
  }

  public setShiftState(state: ShiftState) {
    if (this.shiftState === state) return;
    this.shiftState = state;
    this.drawIcon();
  }

  private drawBackground() {
    const { keyColor, keyPressedColor } = this.colors;
    const idle = this.keyFeedback === 'none' && !this.pressed;
    this.background
      .clear()
      .roundRect(0, 0, this.keyWidth, this.keyHeight, PHONE_KEY_RADIUS)
      .fill({
        color: keyFillColor(this.keyFeedback, this.pressed, keyColor, keyPressedColor),
        alpha: idle && this.isFunctionKey ? FUNCTION_KEY_ALPHA : 1,
      });
  }

  private drawIcon() {
    const color = this.colors.textColor;
    const stroke = { width: ICON_STROKE, color, join: 'round', cap: 'round' } as const;
    const g = this.icon.clear();

    switch (this.def.kind) {
      case 'backspace': {
        // Gboard's tag shape pointing left, with an X inside.
        g.poly([-20, 0, -9, -13, 20, -13, 20, 13, -9, 13]).stroke(stroke);
        g.moveTo(-1, -6).lineTo(11, 6).moveTo(11, -6).lineTo(-1, 6).stroke(stroke);
        break;
      }
      case 'shift': {
        g.poly([0, -17, 16, 1, 7, 1, 7, 13, -7, 13, -7, 1, -16, 1]);
        if (this.shiftState === 'off') g.stroke(stroke);
        else g.fill({ color }).stroke(stroke);
        if (this.shiftState === 'locked') {
          g.roundRect(-9, 18, 18, 3, 1.5).fill({ color });
        }
        break;
      }
      case 'enter': {
        // ↵, mirrored for right-to-left like Gboard's Uyghur layout.
        g.moveTo(16, -12).lineTo(16, 4).lineTo(-15, 4).stroke(stroke);
        g.moveTo(-7, -4).lineTo(-16, 4).lineTo(-7, 12).stroke(stroke);
        this.icon.scale.x = this.rtl ? -1 : 1;
        break;
      }
      default:
        break;
    }
  }
}

const POPUP_PADDING = 6;
const POPUP_RADIUS = 14;
const POPUP_GAP = 8;

/** Gboard's long-press bubble: the alternates in a row above the key, one of them selected. */
export class AlternatesPopup extends Container {
  public selected = 0;

  private readonly background = new Graphics();
  private readonly highlight = new Graphics();
  private readonly cellWidth: number;
  private readonly cellHeight: number;
  private readonly count: number;
  private readonly colors: PhoneKeyColors;

  constructor(
    alternates: string[],
    host: PhoneKeyCap,
    script: TargetScript,
    colors: PhoneKeyColors,
    fontSize: number,
    upperCase: boolean,
    panelWidth: number,
  ) {
    super();
    this.colors = colors;
    this.count = alternates.length;
    this.cellWidth = host.keyWidth;
    this.cellHeight = host.keyHeight;

    const width = this.count * this.cellWidth + POPUP_PADDING * 2;
    const height = this.cellHeight + POPUP_PADDING * 2;
    this.background
      .roundRect(0, 4, width, height, POPUP_RADIUS)
      .fill({ color: 0x000000, alpha: 0.18 })
      .roundRect(0, 0, width, height, POPUP_RADIUS)
      .fill({ color: colors.keyColor });
    this.addChild(this.background, this.highlight);

    alternates.forEach((alternate, index) => {
      const text = new Text({
        text: upperCase ? alternate.toLocaleUpperCase('ug') : alternate,
        resolution: 2,
        style: {
          fill: colors.textColor,
          fontFamily: getFontFamilyForScript(script),
          fontSize,
          fontWeight: '700',
          padding: 20,
        },
        anchor: 0.5,
      });
      text.position.set(
        POPUP_PADDING + (index + 0.5) * this.cellWidth,
        POPUP_PADDING + this.cellHeight / 2,
      );
      this.addChild(text);
    });

    // Centered over the key, kept on the panel, and lifted clear of the finger.
    const centerX = host.x + host.keyWidth / 2;
    this.position.set(
      Math.max(0, Math.min(panelWidth - width, centerX - width / 2)),
      host.y - height - POPUP_GAP,
    );
    this.select(0);
  }

  /** Selects the alternate under the panel-space x, clamped to the ends like Gboard. */
  public selectAt(panelX: number) {
    const index = Math.floor((panelX - this.x - POPUP_PADDING) / this.cellWidth);
    this.select(Math.max(0, Math.min(this.count - 1, index)));
  }

  private select(index: number) {
    this.selected = index;
    this.highlight
      .clear()
      .roundRect(
        POPUP_PADDING + index * this.cellWidth,
        POPUP_PADDING,
        this.cellWidth,
        this.cellHeight,
        POPUP_RADIUS - POPUP_PADDING / 2,
      )
      .fill({ color: this.colors.keyPressedColor });
  }
}
