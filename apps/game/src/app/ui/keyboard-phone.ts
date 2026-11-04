import type { TargetScript } from '@utg/script-converter';
import { Container, Graphics, Text } from 'pixi.js';

import { getFontFamilyForScript } from '../../utils/script';

export type KeyFeedback = 'none' | 'hint' | 'error' | 'error-soft' | 'success';

export type PhoneKeyKind = 'char' | 'shift' | 'backspace' | 'enter' | 'space' | 'layer';

/** The letters page and the 123 page of punctuation and digits, as on iOS and Gboard. */
export type PhoneLayer = 'letters' | 'symbols';

export type PhoneKeyDef = {
  kind: PhoneKeyKind;
  /** The page a `layer` key switches to, and its label. */
  toLayer?: PhoneLayer;
  label?: string;
  /** Tinted like the function keys, as phone keyboards do for the punctuation by Space. */
  muted?: boolean;
  /** Character a `char` key types. */
  glyph?: string;
  /** Character it types while Shift is on, for the iOS Uyghur layout's Shift layer. */
  shiftGlyph?: string;
  /** Characters offered by a long press, like Gboard's accent popup. */
  alternates?: string[];
  /** Width in key pitches. */
  width?: number;
};

/**
 * `'a د|ژ e:é'` → char keys. Text after `|` is the Shift glyph; text after `:` lists the
 * long-press alternates, comma-separated. Neither separator is ever a key here.
 */
function chars(spec: string, width?: number): PhoneKeyDef[] {
  return spec.split(' ').map((token) => {
    const [main, alternates] = token.split(':');
    const [glyph, shiftGlyph] = main.split('|');
    return { kind: 'char', glyph, shiftGlyph, alternates: alternates?.split(','), width };
  });
}

/** Plain keys, one per space-separated character; the symbols page needs `:` and `|` as keys. */
function symbols(spec: string): PhoneKeyDef[] {
  return spec.split(' ').map((glyph) => ({ kind: 'char', glyph }));
}

const shift: PhoneKeyDef = { kind: 'shift', width: 1.5 };
const backspace: PhoneKeyDef = { kind: 'backspace', width: 1.5 };

/** The phone keyboards' bottom row, minus the emoji key the game has no use for. */
function bottomRow(toLayer: PhoneLayer, label: string, comma: string, period: string) {
  return [
    { kind: 'layer', toLayer, label, width: 1.5 },
    ...chars(comma, 1).map((def) => ({ ...def, muted: true })),
    { kind: 'space', width: 4.5 },
    ...chars(period, 1).map((def) => ({ ...def, muted: true })),
    { kind: 'enter', width: 2 },
  ] satisfies PhoneKeyDef[];
}

/**
 * The 123 page: digits, and the punctuation the physical layouts type, which covers every mark
 * in the game's sentences.
 */
function symbolRows(lettersLabel: string, punctuation: string, comma: string): PhoneKeyDef[][] {
  return [
    symbols('1 2 3 4 5 6 7 8 9 0'),
    symbols(punctuation),
    [...symbols("@ # % & * _ ' ="), { kind: 'backspace', width: 2 }],
    bottomRow('letters', lettersLabel, comma, '.'),
  ];
}

/**
 * iOS Uyghur: the physical Uyghur layout, with its Shift letters on the Shift layer.
 * iOS moves ئ from the physical `/` key to Shift+ي, since the phone has no `/` key.
 */
const ARABIC_ROWS: PhoneKeyDef[][] = [
  chars('چ ۋ ې ر ت ي|ئ ۇ ڭ و پ'),
  chars('ھ س د|ژ ا|ف ە|گ ى|خ ق|ج ك|ۆ ل|لا'),
  [shift, ...chars('ز ش غ ۈ ب ن م'), backspace],
  bottomRow('symbols', '123', '،', '.'),
];

/** The iOS Uyghur grid in Cyrillic letters, matching the phonetic physical layout. */
const CYRILLIC_ROWS: PhoneKeyDef[][] = [
  chars('ч в е р т й у ң о п'),
  chars('һ с д|ж а|ф ә|г и|х қ|җ к|ө л'),
  [shift, ...chars('з ш ғ ү б н м'), backspace],
  bottomRow('symbols', '123', ',', '.'),
];

/** Gboard QWERTY; ULY's é, ö, ü hide behind e, o, u, and the hamza apostrophe behind the period. */
const LATIN_ROWS: PhoneKeyDef[][] = [
  chars('q w e:é r t y u:ü i o:ö p'),
  chars('a s d f g h j k l'),
  [shift, ...chars('z x c v b n m'), backspace],
  bottomRow('symbols', '123', ',', ".:'"),
];

const ARABIC_VOWELS = new Set(['ا', 'ە', 'ې', 'ى', 'و', 'ۇ', 'ۆ', 'ۈ']);

/** A vowel takes ئ at the start of a word, so the phone keyboard types it there unasked. */
export function isArabicVowel(glyph: string) {
  return ARABIC_VOWELS.has(glyph);
}

/**
 * Like iOS, an Arabic vowel key at the start of a word shows the vowel with the ئ it takes
 * there, since the key types that ئ too.
 */
export function phoneKeyLabel(glyph: string, script: TargetScript, wordStart = true) {
  return script === 'Arabic' && wordStart && isArabicVowel(glyph) ? `ئ${glyph}` : glyph;
}

export function getPhoneLayers(script: TargetScript): Record<PhoneLayer, PhoneKeyDef[][]> {
  switch (script) {
    case 'Latin':
      return { letters: LATIN_ROWS, symbols: symbolRows('ABC', '- : ; ( ) « » " ! ?', ',') };
    case 'Cyrillic':
      return { letters: CYRILLIC_ROWS, symbols: symbolRows('АБВ', '- : ; ( ) « » " ! ?', ',') };
    default:
      return { letters: ARABIC_ROWS, symbols: symbolRows('ئاب', '- : ؛ ( ) « » " ! ؟', '،') };
  }
}

/** Arabic text needs the Arabic font; digits and Latin punctuation read better in Nunito. */
function fontFor(text: string, script: TargetScript) {
  if (/[\u0600-\u06ff]/u.test(text)) return getFontFamilyForScript('Arabic');
  if (!/\p{L}/u.test(text)) return getFontFamilyForScript('Latin');
  return getFontFamilyForScript(script);
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
const LAYER_FONT_SIZE = 28;
const ALTERNATE_INSET = 7;
const ICON_STROKE = 3;

export class PhoneKeyCap extends Container {
  public readonly def: PhoneKeyDef;
  public layer: PhoneLayer = 'letters';
  public keyWidth = 0;
  public keyHeight = 0;

  private readonly background = new Graphics();
  private readonly icon = new Graphics();
  private readonly glyphLabel?: Text;
  private readonly cornerLabel?: Text;
  private readonly colors: PhoneKeyColors;
  private readonly isFunctionKey: boolean;
  private readonly rtl: boolean;
  private readonly script: TargetScript;
  private pressed = false;
  private keyFeedback: KeyFeedback = 'none';
  private shiftState: ShiftState = 'off';

  constructor(def: PhoneKeyDef, script: TargetScript, colors: PhoneKeyColors, fontSize: number) {
    super();
    this.def = def;
    this.colors = colors;
    this.rtl = script === 'Arabic';
    this.script = script;
    this.isFunctionKey = def.kind !== 'char' || def.muted === true;

    this.addChild(this.background);
    if (def.kind === 'layer') {
      this.glyphLabel = new Text({
        text: def.label ?? '',
        resolution: 2,
        style: {
          fill: colors.textColor,
          fontFamily: fontFor(def.label ?? '', script),
          fontSize: LAYER_FONT_SIZE,
          fontWeight: '700',
          padding: 20,
        },
        anchor: 0.5,
      });
      this.addChild(this.glyphLabel);
    } else if (def.kind === 'char') {
      this.glyphLabel = new Text({
        text: phoneKeyLabel(def.glyph ?? '', script, false),
        resolution: 2,
        style: {
          fill: colors.textColor,
          fontFamily: fontFor(def.glyph ?? '', script),
          fontSize,
          fontWeight: '700',
          padding: 20,
        },
        anchor: 0.5,
      });
      this.addChild(this.glyphLabel);

      // Like the game's desktop keyboard, a corner shows what else the key can type.
      const corner = def.shiftGlyph ?? def.alternates?.[0];
      if (corner) {
        this.cornerLabel = new Text({
          text: phoneKeyLabel(corner, script, false),
          resolution: 2,
          style: {
            fill: colors.hintColor,
            fontFamily: fontFor(corner, script),
            fontSize: ALTERNATE_FONT_SIZE,
            fontWeight: '700',
            padding: 10,
          },
          anchor: { x: 1, y: 0 },
        });
        this.addChild(this.cornerLabel);
      }
    } else {
      this.addChild(this.icon);
    }
  }

  public applySize(keyWidth: number, keyHeight: number) {
    this.keyWidth = keyWidth;
    this.keyHeight = keyHeight;
    this.glyphLabel?.position.set(keyWidth / 2, keyHeight / 2);
    this.cornerLabel?.position.set(keyWidth - ALTERNATE_INSET, ALTERNATE_INSET / 2);
    this.icon.position.set(keyWidth / 2, keyHeight / 2);
    this.drawBackground();
    this.drawIcon();
  }

  /**
   * Shift swaps in the Shift glyph; on Latin keys, Shift and Caps Lock pick the case; at the
   * start of a word, vowels show their ئ.
   */
  public setShifted(shifted: boolean, upperCase: boolean, wordStart: boolean) {
    const { glyph, shiftGlyph, alternates } = this.def;
    if (!this.glyphLabel || !glyph) return;
    const label = (text: string) =>
      phoneKeyLabel(upperCase ? text.toLocaleUpperCase('ug') : text, this.script, wordStart);
    this.glyphLabel.text = label(shifted && shiftGlyph ? shiftGlyph : glyph);
    if (this.cornerLabel) {
      // The Shift glyph is on the key face while shifted, so the corner has nothing to add.
      this.cornerLabel.text = shiftGlyph
        ? shifted
          ? ''
          : label(shiftGlyph)
        : label(alternates?.[0] ?? '');
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
    // The bottom corner keys are pills, so they follow the phone screen's rounded corners.
    const pill = this.def.kind === 'layer' || this.def.kind === 'enter';
    const radius = pill ? Math.min(this.keyWidth, this.keyHeight) / 2 : PHONE_KEY_RADIUS;
    this.background
      .clear()
      .roundRect(0, 0, this.keyWidth, this.keyHeight, radius)
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
        // ↵, mirrored for right-to-left text.
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
          fontFamily: fontFor(alternate, script),
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
