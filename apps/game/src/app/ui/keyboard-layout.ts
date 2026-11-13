import type { TargetScript } from '@utg/script-converter';
import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, type FederatedPointerEvent, Graphics, Rectangle, Text } from 'pixi.js';

import { responsive, safeAreaInsets } from '../../engine/utils/viewport';
import { DISPLAY_FONT_FAMILY } from '../../utils/fonts';
import {
  getKeyFromChar,
  getKeyStrokeFromChar,
  getKeyboardLabel,
  getMappedFromKeyCode,
  getShiftHintLabel,
  isAuxiliaryKey,
} from '../../utils/keymap';
import { getCurrentTargetScript, getScriptFontFamily } from '../../utils/script';
import {
  AlternatesPopup,
  getPhoneLayers,
  isArabicVowel,
  type KeyFeedback,
  keyFillColor,
  PhoneKeyCap,
  type PhoneKeyColors,
  type PhoneKeyDef,
  type PhoneLayer,
} from './keyboard-phone';

export type { KeyFeedback };

type Key = {
  code: string;
  width?: number;
};

/**
 * What a level types, which decides where a word starts for the phone's word-initial ئ:
 * letter levels never start a word, word levels start one on each word's first letter, and
 * sentence levels also start one after each space, quote, bracket or hyphen.
 */
export type KeyboardText = 'letters' | 'words' | 'sentences';

export type KeyboardOptions = {
  colors?: KeyboardColorOptions;
  text?: KeyboardText;
};

export type KeyboardColorOptions = {
  PANEL_COLOR: number;
  PANEL_SHADOW_COLOR: number;
  KEY_COLOR: number;
  KEY_PRESSED_COLOR: number;
  TEXT_COLOR: number;
  SHIFT_HINT_COLOR: number;
};

const keyboardLayout: Key[][] = [
  [
    { code: 'Backquote' },
    { code: 'Digit1' },
    { code: 'Digit2' },
    { code: 'Digit3' },
    { code: 'Digit4' },
    { code: 'Digit5' },
    { code: 'Digit6' },
    { code: 'Digit7' },
    { code: 'Digit8' },
    { code: 'Digit9' },
    { code: 'Digit0' },
    { code: 'Minus' },
    { code: 'Equal' },
    { code: 'Backspace', width: 1.7 },
  ],
  [
    { code: 'Tab', width: 1.7 },
    { code: 'KeyQ' },
    { code: 'KeyW' },
    { code: 'KeyE' },
    { code: 'KeyR' },
    { code: 'KeyT' },
    { code: 'KeyY' },
    { code: 'KeyU' },
    { code: 'KeyI' },
    { code: 'KeyO' },
    { code: 'KeyP' },
    { code: 'BracketLeft' },
    { code: 'BracketRight' },
    { code: 'Backslash' },
  ],
  [
    { code: 'CapsLock', width: 2.05 },
    { code: 'KeyA' },
    { code: 'KeyS' },
    { code: 'KeyD' },
    { code: 'KeyF' },
    { code: 'KeyG' },
    { code: 'KeyH' },
    { code: 'KeyJ' },
    { code: 'KeyK' },
    { code: 'KeyL' },
    { code: 'Semicolon' },
    { code: 'Quote' },
    { code: 'Enter', width: 1.8 },
  ],
  [
    { code: 'ShiftLeft', width: 2.5 },
    { code: 'KeyZ' },
    { code: 'KeyX' },
    { code: 'KeyC' },
    { code: 'KeyV' },
    { code: 'KeyB' },
    { code: 'KeyN' },
    { code: 'KeyM' },
    { code: 'Comma' },
    { code: 'Period' },
    { code: 'Slash' },
    { code: 'ShiftRight', width: 2.45 },
  ],
  [
    { code: '' },
    { code: '' },
    { code: '' },
    { code: '' },
    { code: 'Space', width: 6 },
    { code: '' },
    { code: '' },
    { code: '' },
    { code: '', width: 2.3 },
  ],
];

// Style constants mirrored from the previous Tailwind component (1rem = 16px).
const UNIT = 4.2 * 16; // --u: 4.2rem
const KEY_GAP = 8; // gap-2
const ROW_GAP = 8; // gap-2
const PANEL_PADDING = 24; // p-6
const PANEL_RADIUS = 32; // rounded-4xl
const KEY_RADIUS = 12; // rounded-xl
const BOTTOM_MARGIN = 40; // bottom-10
const MAX_WIDTH_FACTOR = 0.92;
const ENTER_Y_OFFSET = 72;
const EXIT_Y_OFFSET = 48;

// Phones get a Gboard-style panel instead: edge to edge, square, sized for a 768-wide view.
const PHONE_PADDING_X = 6;
const PHONE_PADDING_TOP = 12;
const PHONE_PADDING_BOTTOM = 10;
const PHONE_KEY_HEIGHT = 80;
const PHONE_KEY_GAP = 9;
const PHONE_ROW_GAP = 16;
// Paints past the screen bottom so the enter animation's overshoot never shows a gap.
const PHONE_BLEED = 120;
const LONG_PRESS_MS = 350;
const SHIFT_DOUBLE_TAP_MS = 350;

const PANEL_COLOR = 0xf3ca8a;
const PANEL_SHADOW_COLOR = 0xc98144;
const KEY_COLOR = 0xc98144;
const KEY_PRESSED_COLOR = 0x8d6241;
const TEXT_COLOR = 0xffffff;
const SHIFT_HINT_COLOR = 0xffde59;

const DEFAULT_COLOR_OPTIONS: KeyboardColorOptions = {
  PANEL_COLOR,
  PANEL_SHADOW_COLOR,
  KEY_COLOR,
  KEY_PRESSED_COLOR,
  TEXT_COLOR,
  SHIFT_HINT_COLOR,
};

const SHIFT_HINT_PADDING = 6;
const SHIFT_HINT_FONT_SIZE = 22;
const HOME_KEY_CODES = new Set(['KeyF', 'KeyJ']);
const HOME_BUMP_WIDTH = 16;
const HOME_BUMP_HEIGHT = 3;
const HOME_BUMP_BOTTOM = 7;
const SHIFT_CODES = new Set(['ShiftLeft', 'ShiftRight']);
// Keys with no meaning in the game stay inert when tapped.
const UNTAPPABLE_CODES = new Set(['', 'Tab']);
// Apple platforms fire Caps Lock keydown when it turns on and keyup when it
// turns off, and report the new state on both.
const IS_APPLE = /Mac|iPhone|iPad/.test(navigator.userAgent);

/** `KeyboardEvent.key` a physical press of `code` would report. */
function getEventKey(code: string, shift: boolean, capsLock: boolean): string {
  if (SHIFT_CODES.has(code)) return 'Shift';
  if (code === 'Backspace' || code === 'Enter' || code === 'CapsLock') return code;
  if (code === 'Space') return ' ';
  return getMappedFromKeyCode(code, shift, capsLock);
}

const keyWidthOf = (key: Key) => UNIT * (key.width ?? 1);
const rowWidthOf = (row: Key[]) =>
  row.reduce((sum, key) => sum + keyWidthOf(key), 0) + KEY_GAP * (row.length - 1);
const REGULAR_PANEL_WIDTH = Math.max(...keyboardLayout.map(rowWidthOf)) + PANEL_PADDING * 2;
const REGULAR_PANEL_HEIGHT =
  keyboardLayout.length * UNIT + ROW_GAP * (keyboardLayout.length - 1) + PANEL_PADDING * 2;

const phoneRowUnits = (row: PhoneKeyDef[]) => row.reduce((sum, def) => sum + (def.width ?? 1), 0);

/** Physical keystroke a phone key sends; `shift` marks glyphs that live on the Shift layer. */
type Stroke = { code: string; shift: boolean };
type PressedStroke = { code: string; shiftKey: boolean; wrappedShift: boolean };

/** A finger on a phone key. Keys with alternates type on release, or pick from the popup. */
type PhoneTouch = {
  key: PhoneKeyCap;
  pressed?: PressedStroke;
  timer?: number;
  popup?: AlternatesPopup;
};

class KeyCap extends Container {
  public readonly code: string;
  public keyWidth: number;

  private keyHeight = UNIT;
  private homeBump?: Graphics;
  private readonly background = new Graphics();
  private readonly keyContent = new Container();
  private readonly keyLabel: Text;
  private readonly hintLabel: Text;
  private readonly keyColor: number;
  private readonly keyPressedColor: number;
  private pressed = false;
  private feedback: KeyFeedback = 'none';

  constructor(
    code: string,
    isAuxiliary = false,
    textColor = TEXT_COLOR,
    keyColor = KEY_COLOR,
    keyPressedColor = KEY_PRESSED_COLOR,
    shiftHintColor = SHIFT_HINT_COLOR,
  ) {
    super();
    this.code = code;
    this.keyWidth = UNIT;

    const isShift = SHIFT_CODES.has(code);

    this.keyLabel = new Text({
      text: '',
      resolution: 2,
      style: {
        align: 'center',
        fill: isShift ? shiftHintColor : textColor,
        fontFamily: isAuxiliary ? DISPLAY_FONT_FAMILY : getScriptFontFamily(),
        fontSize: isAuxiliary ? 26 : 30,
        fontWeight: '700',
        lineHeight: isAuxiliary ? 26 : 30,
        padding: 30,
      },
      anchor: 0.5,
    });
    this.keyLabel.position.set(this.keyWidth / 2, UNIT / 2);

    this.hintLabel = new Text({
      text: '',
      resolution: 2,
      style: {
        align: 'left',
        fill: shiftHintColor,
        fontFamily: getScriptFontFamily(),
        fontSize: SHIFT_HINT_FONT_SIZE,
        fontWeight: '700',
        lineHeight: SHIFT_HINT_FONT_SIZE,
        padding: 10,
      },
      anchor: { x: 0, y: 0 },
    });
    this.hintLabel.position.set(SHIFT_HINT_PADDING, SHIFT_HINT_PADDING);
    this.hintLabel.visible = false;

    this.keyColor = keyColor;
    this.keyPressedColor = keyPressedColor;

    this.keyContent.addChild(this.keyLabel, this.hintLabel);
    this.drawBackground();
    this.addChild(this.background);
    if (HOME_KEY_CODES.has(code)) {
      this.homeBump = this.createHomeBump(textColor);
      this.addChild(this.homeBump);
      this.positionHomeBump();
    }
    this.addChild(this.keyContent);
  }

  private createHomeBump(color: number) {
    return new Graphics()
      .roundRect(0, 0, HOME_BUMP_WIDTH, HOME_BUMP_HEIGHT, HOME_BUMP_HEIGHT / 2)
      .fill({ color, alpha: 0.55 });
  }

  private positionHomeBump() {
    this.homeBump?.position.set(
      (this.keyWidth - HOME_BUMP_WIDTH) / 2,
      this.keyHeight - HOME_BUMP_HEIGHT - HOME_BUMP_BOTTOM,
    );
  }

  public applySize(keyWidth: number, keyHeight: number) {
    this.keyWidth = keyWidth;
    this.keyHeight = keyHeight;
    this.keyLabel.position.set(keyWidth / 2, keyHeight / 2);
    this.positionHomeBump();
    this.drawBackground();
  }

  public setPressed(pressed: boolean) {
    if (this.pressed === pressed) return;
    this.pressed = pressed;
    this.drawBackground();
  }

  public setFeedback(feedback: KeyFeedback) {
    if (this.feedback === feedback) return;

    this.feedback = feedback;
    this.drawBackground();
  }

  public setLabel(text: string) {
    if (this.keyLabel.text === text) return;
    this.keyLabel.text = text;
  }

  public setHint(text: string) {
    if (this.hintLabel.text !== text) {
      this.hintLabel.text = text;
    }
    this.hintLabel.visible = text.length > 0;
  }

  private drawBackground() {
    this.background
      .clear()
      .roundRect(0, 0, this.keyWidth, this.keyHeight, KEY_RADIUS)
      .fill({
        color: keyFillColor(this.feedback, this.pressed, this.keyColor, this.keyPressedColor),
      });
  }
}

export class KeyboardLayout extends Container {
  private readonly panel = new Container();
  private readonly panelBackground = new Graphics();
  private readonly regularKeys = new Container();
  private readonly keys: KeyCap[] = [];
  private readonly keyByCode = new Map<string, KeyCap>();
  private readonly pressedCodes = new Set<string>();
  private readonly keyboardColorOptions;
  private readonly text: KeyboardText;
  private hintedCode = '';
  /** The next letter starts a word, so a vowel key shows and types its ئ. */
  private wordStart = false;
  /** The last key the player typed, until the level accepts it by lighting it green. */
  private lastTypedCode = '';
  /** What that key typed: a sentence's words start after a space or other non-letter. */
  private lastTypedText = '';
  /** Code held by each pointer tapping the on-screen keys. */
  private readonly tappedCodes = new Map<number, string>();
  /** Tapped Shift stays held until the next key tap, like a phone keyboard. */
  private latchedShiftCode = '';
  /** Caps Lock toggle, synced from the OS state on every physical key event. */
  private capsLockOn = false;
  /** Last known OS Caps Lock state; differs from `capsLockOn` after a tap on CAPS. */
  private osCapsLockOn = false;

  private listening = false;

  private mode: 'regular' | 'phone' = 'regular';
  private panelWidth = REGULAR_PANEL_WIDTH;
  private panelHeight = REGULAR_PANEL_HEIGHT;
  private enterExitAnimation?: AnimationPlaybackControls;

  // Phone layout, built the first time a phone-sized view asks for it.
  private readonly phoneKeyLayer = new Container();
  private phoneScript?: TargetScript;
  private phoneLayers?: Record<PhoneLayer, PhoneKeyDef[][]>;
  private phoneLayerShown: PhoneLayer = 'letters';
  private phoneKeys: PhoneKeyCap[] = [];
  /** Lowercased glyph, primary or long-press alternate, → the keys that type it, on either page. */
  private readonly phoneKeyByGlyph = new Map<string, PhoneKeyCap[]>();
  private readonly phoneKeyByKind = new Map<PhoneKeyDef['kind'], PhoneKeyCap[]>();
  /** Kept so the hint can follow the player between the letters and 123 pages. */
  private hintedLetter?: string;
  /** The letter after the hinted one, which picks the vowel key for a word-initial ئ. */
  private hintedNextLetter?: string;
  /** Several phone keys can share a physical code (د and ژ); this is the one last typed. */
  private readonly lastPhoneKeyByCode = new Map<string, PhoneKeyCap>();
  /** The phone keys each code's feedback landed on, so clearing it finds the same keys. */
  private readonly phoneFeedbackKeysByCode = new Map<string, PhoneKeyCap[]>();
  private readonly shiftCodesWithFeedback = new Set<string>();
  private hintedPhoneKeys: PhoneKeyCap[] = [];
  private readonly heldPhoneKeys = new Set<PhoneKeyCap>();
  private readonly phoneTouches = new Map<number, PhoneTouch>();
  private lastShiftTapAt = -Infinity;
  private appliedPhoneLayout = '';

  constructor({ colors = DEFAULT_COLOR_OPTIONS, text = 'letters' }: KeyboardOptions = {}) {
    super();
    this.keyboardColorOptions = colors;
    this.text = text;
    this.buildPanel();
    this.layoutRegularKeys();
    this.drawRegularBackground();
    this.panel.alpha = 0;
    this.addChild(this.panel);
    this.applyHiddenPose();
    this.setListening(true);
  }

  /** Center horizontally and pin to the bottom of the given view size. */
  public resize(viewWidth: number, viewHeight: number, bottomMargin?: number) {
    if (responsive({ sm: true, lg: false })) {
      this.resizePhone(viewWidth, viewHeight, bottomMargin);
      return;
    }

    this.setMode('regular');
    const { bottom } = safeAreaInsets();
    // Insets are CSS pixels, the view isn't.
    const safeBottom = (bottom / window.innerHeight) * viewHeight;
    const margin = bottomMargin ?? Math.max(BOTTOM_MARGIN, safeBottom);
    const scale = Math.min(1, (viewWidth * MAX_WIDTH_FACTOR) / this.panelWidth);
    this.scale.set(scale);
    this.position.set(
      Math.round((viewWidth - this.panelWidth * scale) / 2),
      Math.round(viewHeight - margin - this.panelHeight * scale),
    );
  }

  /** `resize` for a keyboard nested in a scaled stage: sized to the screen, not the stage. */
  public resizeToScreen(stage: Container, viewWidth: number, viewHeight: number) {
    this.resize(viewWidth, viewHeight);
    const stageScale = stage.scale.x;
    this.scale.set(this.scale.x / stageScale);
    this.position.set((this.x - stage.x) / stageScale, (this.y - stage.y) / stageScale);
  }

  public async pause() {
    this.setListening(false);
  }

  public async resume() {
    this.setListening(true);
  }

  public async playEnterAnimation(animated = true) {
    this.enterExitAnimation?.stop();
    if (!animated) {
      this.panel.alpha = 1;
      this.panel.y = 0;
      return;
    }

    this.applyHiddenPose();

    this.enterExitAnimation = animate(
      this.panel,
      { alpha: 1, y: 0 },
      { duration: 0.4, ease: 'backOut' },
    );
    await this.enterExitAnimation.finished;
  }

  public async playExitAnimation(animated = true) {
    this.enterExitAnimation?.stop();
    if (!animated) {
      this.applyHiddenPose();
      return;
    }

    this.enterExitAnimation = animate(
      this.panel,
      { alpha: 0, y: EXIT_Y_OFFSET },
      { duration: 0.2, ease: 'backIn' },
    );
    await this.enterExitAnimation.finished;
  }

  public setKeyFeedback(code: string, feedback: KeyFeedback) {
    this.keyByCode.get(code)?.setFeedback(feedback);
    if (feedback === 'success' && code === this.lastTypedCode) this.onKeyAccepted();

    if (SHIFT_CODES.has(code)) {
      if (feedback === 'none') this.shiftCodesWithFeedback.delete(code);
      else this.shiftCodesWithFeedback.add(code);
    }

    if (feedback === 'none') {
      const keys = this.phoneFeedbackKeysByCode.get(code) ?? [
        this.phoneKeyForCode(code, false),
        this.phoneKeyForCode(code, true),
      ];
      this.phoneFeedbackKeysByCode.delete(code);
      for (const phoneKey of keys) {
        phoneKey?.setFeedback(this.hintedPhoneKeys.includes(phoneKey) ? 'hint' : 'none');
      }
      return;
    }

    const key = this.resolvePhoneKey(code);
    if (!key) return;
    const keys = [key];
    // A hinted Shift-layer letter also hints Shift, which a phone needs even where a physical
    // keyboard doesn't: iOS puts ئ on Shift+ي, not on its own key.
    const glyph = getMappedFromKeyCode(code, this.shiftCodesWithFeedback.size > 0);
    const shiftKey = this.phoneKeyOfKind('shift');
    if (feedback === 'hint' && shiftKey && this.needsPhoneShift(key, glyph)) keys.push(shiftKey);
    for (const phoneKey of keys) phoneKey.setFeedback(feedback);
    this.phoneFeedbackKeysByCode.set(code, keys);
  }

  public clearKeyFeedback(code: string) {
    this.setKeyFeedback(code, 'none');
  }

  /**
   * Highlights the key for `letter` as a hint; pass undefined to clear it. `nextLetter`, the
   * letter after it, lets a phone hint the vowel key for a word-initial ئ, since that key types
   * the ئ.
   */
  public setHintedLetter(letter?: string, nextLetter?: string) {
    if (this.hintedCode) this.keyByCode.get(this.hintedCode)?.setFeedback('none');
    this.hintedLetter = letter;
    this.hintedNextLetter = nextLetter;
    this.hintedCode = letter ? getKeyFromChar(letter) : '';
    if (this.hintedCode) this.keyByCode.get(this.hintedCode)?.setFeedback('hint');

    // Unhinting leaves a success or error flash alone; that clears on its own timer.
    for (const key of this.hintedPhoneKeys) {
      if (key.feedback === 'hint') key.setFeedback('none');
    }
    this.hintedPhoneKeys = [];
    if (!letter) return;

    // At the start of a word the vowel key types the ئ, so it's the key to tap, not Shift+ي.
    const glyph =
      letter === 'ئ' && this.isWordStart() && nextLetter && isArabicVowel(nextLetter)
        ? nextLetter
        : letter;
    const key = glyph === ' ' ? this.phoneKeyOfKind('space') : this.phoneKeyForGlyph(glyph);
    if (!key) return;
    this.hintedPhoneKeys.push(key);
    const shiftKey = this.phoneKeyOfKind('shift');
    if (shiftKey && this.needsPhoneShift(key, glyph)) this.hintedPhoneKeys.push(shiftKey);
    // A character on the other page also lights the key that switches to it.
    const layerKey = this.phoneKeyOfKind('layer');
    if (layerKey && key.layer !== this.phoneLayerShown) this.hintedPhoneKeys.push(layerKey);
    for (const hinted of this.hintedPhoneKeys) hinted.setFeedback('hint');
  }

  /** A capital or a Shift-layer letter needs Shift first, unless Shift is already on. */
  private needsPhoneShift(key: PhoneKeyCap, glyph: string) {
    if (this.isPhoneShifted()) return false;
    if (key.def.shiftGlyph) return key.def.shiftGlyph === glyph;
    return this.phoneScript === 'Latin' && glyph !== glyph.toLocaleLowerCase('ug');
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.enterExitAnimation?.stop();
    this.setListening(false);
    super.destroy(options);
  }

  private buildPanel() {
    const shiftPressed = false;

    this.panel.addChild(this.panelBackground, this.regularKeys, this.phoneKeyLayer);
    this.phoneKeyLayer.visible = false;

    for (const { code } of keyboardLayout.flat()) {
      const cap = new KeyCap(
        code,
        isAuxiliaryKey(code),
        this.keyboardColorOptions.TEXT_COLOR,
        this.keyboardColorOptions.KEY_COLOR,
        this.keyboardColorOptions.KEY_PRESSED_COLOR,
        this.keyboardColorOptions.SHIFT_HINT_COLOR,
      );
      cap.setLabel(getKeyboardLabel(code, shiftPressed));
      cap.setHint(getShiftHintLabel(code));
      if (!UNTAPPABLE_CODES.has(code)) {
        cap.eventMode = 'static';
        cap.cursor = 'pointer';
        cap.on('pointerdown', (event) => this.onKeyPointerDown(cap.code, event));
        cap.on('pointerup', (event) => this.onKeyPointerUp(event));
        cap.on('pointerupoutside', (event) => this.onKeyPointerUp(event));
        cap.on('pointercancel', (event) => this.onKeyPointerUp(event));
      }
      this.keys.push(cap);
      if (code) {
        this.keyByCode.set(code, cap);
      }
      this.regularKeys.addChild(cap);
    }
  }

  private layoutRegularKeys() {
    let index = 0;
    keyboardLayout.forEach((row, rowIndex) => {
      let x = (REGULAR_PANEL_WIDTH - rowWidthOf(row)) / 2;
      const y = PANEL_PADDING + rowIndex * (UNIT + ROW_GAP);
      for (const key of row) {
        const cap = this.keys[index++];
        cap.applySize(keyWidthOf(key), UNIT);
        cap.position.set(x, y);
        x += cap.keyWidth + KEY_GAP;
      }
    });
  }

  private drawRegularBackground() {
    const { panelWidth, panelHeight } = this;
    this.panelBackground
      .clear()
      .roundRect(0, 12, panelWidth, panelHeight, PANEL_RADIUS)
      .fill({ color: this.keyboardColorOptions.PANEL_SHADOW_COLOR, alpha: 0.7 })
      .roundRect(0, 0, panelWidth, panelHeight, PANEL_RADIUS)
      .fill({ color: this.keyboardColorOptions.PANEL_COLOR });
  }

  private setMode(mode: 'regular' | 'phone') {
    if (this.mode === mode) return;
    this.mode = mode;
    this.cancelPhoneTouches();
    this.regularKeys.visible = mode === 'regular';
    this.phoneKeyLayer.visible = mode === 'phone';
    if (mode === 'regular') {
      this.panelWidth = REGULAR_PANEL_WIDTH;
      this.panelHeight = REGULAR_PANEL_HEIGHT;
      this.drawRegularBackground();
    } else {
      this.appliedPhoneLayout = '';
    }
  }

  /** Full-width panel flush with the screen bottom, with the home indicator inset inside it. */
  private resizePhone(viewWidth: number, viewHeight: number, bottomMargin?: number) {
    this.setMode('phone');
    this.ensurePhoneKeys();

    const { left, right, bottom } = safeAreaInsets();
    // Insets are CSS pixels, the view isn't.
    const toViewX = viewWidth / window.innerWidth;
    // A caller-placed keyboard floats above other content, so it has no inset to cover.
    const floating = bottomMargin !== undefined;
    const safeBottom = floating ? 0 : (bottom / window.innerHeight) * viewHeight;
    this.layoutPhoneKeys(viewWidth, left * toViewX, right * toViewX, safeBottom, floating);

    this.scale.set(1);
    this.position.set(0, Math.round(viewHeight - (bottomMargin ?? 0) - this.panelHeight));
  }

  private ensurePhoneKeys() {
    const script = getCurrentTargetScript();
    if (this.phoneScript === script) return;

    this.cancelPhoneTouches();
    for (const key of this.phoneKeys) key.destroy({ children: true });
    this.phoneKeys = [];
    this.phoneKeyByGlyph.clear();
    this.phoneKeyByKind.clear();
    this.lastPhoneKeyByCode.clear();
    this.phoneFeedbackKeysByCode.clear();
    this.hintedPhoneKeys = [];
    this.appliedPhoneLayout = '';

    this.phoneScript = script;
    this.phoneLayers = getPhoneLayers(script);
    this.phoneLayerShown = 'letters';
    const fontSize = this.phoneFontSize();
    const defs = Object.entries(this.phoneLayers).flatMap(([layer, rows]) =>
      rows.flat().map((def) => ({ def, layer: layer as PhoneLayer })),
    );
    for (const { def, layer } of defs) {
      const key = new PhoneKeyCap(def, script, this.phoneColors(), fontSize);
      key.layer = layer;
      key.visible = layer === this.phoneLayerShown;
      key.eventMode = 'static';
      key.cursor = 'pointer';
      key.on('pointerdown', (event) => this.onPhoneKeyDown(key, event));
      key.on('pointerup', (event) => this.onPhoneKeyUp(event, false));
      key.on('pointerupoutside', (event) => this.onPhoneKeyUp(event, false));
      key.on('pointercancel', (event) => this.onPhoneKeyUp(event, true));
      if (def.alternates?.length) {
        key.on('globalpointermove', (event) => this.onPhonePointerMove(event));
      }

      if (def.kind === 'char' && def.glyph) {
        const glyphs = [def.glyph, def.shiftGlyph, ...(def.alternates ?? [])];
        for (const glyph of glyphs.filter((glyph) => glyph !== undefined)) {
          const lower = glyph.toLocaleLowerCase('ug');
          this.phoneKeyByGlyph.set(lower, [...(this.phoneKeyByGlyph.get(lower) ?? []), key]);
        }
      } else {
        this.phoneKeyByKind.set(def.kind, [...(this.phoneKeyByKind.get(def.kind) ?? []), key]);
      }
      this.phoneKeys.push(key);
      this.phoneKeyLayer.addChild(key);
    }
    // A hint set before these keys existed (or on the old script's keys) lands now.
    this.setHintedLetter(this.hintedLetter, this.hintedNextLetter);
    this.refreshKeys();
  }

  private phoneColors(): PhoneKeyColors {
    const { KEY_COLOR, KEY_PRESSED_COLOR, TEXT_COLOR, SHIFT_HINT_COLOR } =
      this.keyboardColorOptions;
    return {
      keyColor: KEY_COLOR,
      keyPressedColor: KEY_PRESSED_COLOR,
      textColor: TEXT_COLOR,
      hintColor: SHIFT_HINT_COLOR,
    };
  }

  private phoneFontSize() {
    return this.phoneScript === 'Arabic' ? 40 : 36;
  }

  /** Gboard's grid: one pitch per key, the gap carved out of each key, short rows centered. */
  private layoutPhoneKeys(
    viewWidth: number,
    insetLeft: number,
    insetRight: number,
    safeBottom: number,
    floating: boolean,
  ) {
    const signature = [viewWidth, insetLeft, insetRight, safeBottom, floating].join('|');
    if (this.appliedPhoneLayout === signature) return;
    this.appliedPhoneLayout = signature;

    if (!this.phoneLayers) return;
    // Both pages share one grid, so switching never moves the keys the player is aiming at.
    const pages = Object.values(this.phoneLayers);
    const rows = Math.max(...pages.map((page) => page.length));
    const units = Math.max(...pages.flat().map(phoneRowUnits));
    const pitch = (viewWidth - insetLeft - insetRight - PHONE_PADDING_X * 2) / units;
    const rowPitch = PHONE_KEY_HEIGHT + PHONE_ROW_GAP;

    let index = 0;
    for (const page of pages) {
      page.forEach((row, rowIndex) => {
        let x = insetLeft + PHONE_PADDING_X + ((units - phoneRowUnits(row)) * pitch) / 2;
        const y = PHONE_PADDING_TOP + rowIndex * rowPitch;
        for (const def of row) {
          const key = this.phoneKeys[index++];
          const width = (def.width ?? 1) * pitch;
          key.position.set(x + PHONE_KEY_GAP / 2, y);
          key.applySize(width - PHONE_KEY_GAP, PHONE_KEY_HEIGHT);
          // Taps in the gaps still land on the nearest key.
          key.hitArea = new Rectangle(-PHONE_KEY_GAP / 2, -PHONE_ROW_GAP / 2, width, rowPitch);
          x += width;
        }
      });
    }

    this.panelWidth = viewWidth;
    this.panelHeight =
      PHONE_PADDING_TOP + rows * rowPitch - PHONE_ROW_GAP + PHONE_PADDING_BOTTOM + safeBottom;
    this.panelBackground
      .clear()
      .rect(0, 0, this.panelWidth, this.panelHeight + (floating ? 0 : PHONE_BLEED))
      .fill({ color: this.keyboardColorOptions.PANEL_COLOR });
  }

  /** Of keys typing the same thing on both pages (Space, the period), the one showing. */
  private pickShownKey(keys?: PhoneKeyCap[]) {
    return keys?.find((key) => key.layer === this.phoneLayerShown) ?? keys?.[0];
  }

  private phoneKeyForGlyph(glyph: string) {
    return this.pickShownKey(this.phoneKeyByGlyph.get(glyph.toLocaleLowerCase('ug')));
  }

  private phoneKeyOfKind(kind: PhoneKeyDef['kind']) {
    return this.pickShownKey(this.phoneKeyByKind.get(kind));
  }

  /** Like iOS: the 123 key swaps pages, and Shift doesn't carry over to the other one. */
  private showPhoneLayer(layer: PhoneLayer) {
    if (this.phoneLayerShown === layer) return;
    this.releaseLatchedShift();
    this.phoneLayerShown = layer;
    for (const key of this.phoneKeys) key.visible = key.layer === layer;
    this.setHintedLetter(this.hintedLetter, this.hintedNextLetter);
    this.refreshKeys();
  }

  private phoneKeyForCode(code: string, shift: boolean): PhoneKeyCap | undefined {
    switch (code) {
      case 'Space':
        return this.phoneKeyOfKind('space');
      case 'Enter':
        return this.phoneKeyOfKind('enter');
      case 'Backspace':
        return this.phoneKeyOfKind('backspace');
      case 'ShiftLeft':
      case 'ShiftRight':
        return this.phoneKeyOfKind('shift');
    }
    const glyph = getMappedFromKeyCode(code, shift);
    return glyph ? this.phoneKeyForGlyph(glyph) : undefined;
  }

  /**
   * Levels name keys by physical code, but a phone key is a glyph, and د and ژ share KeyD.
   * A lit Shift (the typing tutorial's "Shift + key" step) means the Shift glyph; otherwise
   * it's the key last typed with that code, falling back to the unshifted glyph.
   */
  private resolvePhoneKey(code: string) {
    if (this.shiftCodesWithFeedback.size > 0) {
      const shifted = this.phoneKeyForCode(code, true);
      if (shifted) return shifted;
    }
    return (
      this.lastPhoneKeyByCode.get(code) ??
      this.phoneKeyForCode(code, false) ??
      this.phoneKeyForCode(code, true)
    );
  }

  private applyHiddenPose() {
    this.panel.position.set(0, ENTER_Y_OFFSET);
    this.panel.alpha = 0;
  }

  private setListening(listening: boolean) {
    if (this.listening === listening) return;
    this.listening = listening;

    if (listening) {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      window.addEventListener('blur', this.onBlur);
    } else {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('blur', this.onBlur);
      this.tappedCodes.clear();
      this.cancelPhoneTouches();
      this.latchedShiftCode = '';
      this.pressedCodes.clear();
      this.clearAllKeyFeedback();
      this.refreshKeys();
    }
  }

  public clearAllKeyFeedback() {
    for (const cap of this.keys) {
      cap.setFeedback('none');
    }
    for (const key of this.phoneKeys) {
      key.setFeedback('none');
    }
    this.phoneFeedbackKeysByCode.clear();
    this.shiftCodesWithFeedback.clear();
    this.hintedPhoneKeys = [];
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    this.syncCapsLock(event);
    // The OS never sees a tapped Shift, so a physical key arrives unshifted:
    // drop the latch so the labels match what the key actually types.
    if (event.isTrusted && this.latchedShiftCode) {
      if (event.code === this.latchedShiftCode) this.latchedShiftCode = '';
      else this.releaseLatchedShift();
    }
    if (event.isTrusted) {
      const key = this.phoneKeyForCode(event.code, event.shiftKey);
      if (key) this.lastPhoneKeyByCode.set(event.code, key);
      this.lastTypedCode = event.code;
      this.lastTypedText = event.key;
    }
    this.pressedCodes.add(event.code);
    this.refreshKeys();
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.syncCapsLock(event);
    // A physical Shift released over the latch already reports its own keyup.
    if (event.isTrusted && event.code === this.latchedShiftCode) this.latchedShiftCode = '';
    this.pressedCodes.delete(event.code);
    this.refreshKeys();
  };

  private syncCapsLock(event: KeyboardEvent) {
    if (!event.isTrusted) return;
    if (event.code === 'CapsLock' && !IS_APPLE) {
      // Linux reports the state from before a Caps Lock press (and still "on"
      // on the keyup that turns it off), so toggle on keydown instead.
      if (event.type !== 'keydown') return;
      this.osCapsLockOn = !this.osCapsLockOn;
    } else {
      this.osCapsLockOn = event.getModifierState('CapsLock');
    }
    this.capsLockOn = this.osCapsLockOn;
  }

  private readonly onBlur = () => {
    this.tappedCodes.clear();
    this.cancelPhoneTouches();
    this.latchedShiftCode = '';
    this.pressedCodes.clear();
    this.refreshKeys();
  };

  /**
   * Taps are replayed as window key events, so levels handle them exactly like
   * physical presses and the key visuals update through the same listeners.
   */
  private onKeyPointerDown(code: string, event: FederatedPointerEvent) {
    event.stopPropagation();
    if (!this.canTap(event)) return;

    if (SHIFT_CODES.has(code)) {
      if (this.latchedShiftCode) this.releaseLatchedShift();
      else {
        this.latchedShiftCode = code;
        this.dispatchKey('keydown', code);
      }
      return;
    }

    // Like the OS, the toggle flips on keydown so that event already reports it.
    if (code === 'CapsLock') this.capsLockOn = !this.capsLockOn;
    this.tappedCodes.set(event.pointerId, code);
    this.dispatchKey('keydown', code);
  }

  private onKeyPointerUp(event: FederatedPointerEvent) {
    const code = this.tappedCodes.get(event.pointerId);
    if (code === undefined) return;
    this.tappedCodes.delete(event.pointerId);
    this.dispatchKey('keyup', code);
    if (code !== 'CapsLock') this.releaseLatchedShift();
  }

  private canTap(event: FederatedPointerEvent) {
    return (
      this.listening &&
      this.panel.alpha > 0 &&
      !this.tappedCodes.has(event.pointerId) &&
      !this.phoneTouches.has(event.pointerId)
    );
  }

  /** Phone keys fire on touch, except keys with alternates, which wait to see if it's a hold. */
  private onPhoneKeyDown(key: PhoneKeyCap, event: FederatedPointerEvent) {
    event.stopPropagation();
    if (!this.canTap(event)) return;

    if (key.def.kind === 'shift') {
      this.tapPhoneShift();
      return;
    }
    if (key.def.kind === 'layer' && key.def.toLayer) {
      this.showPhoneLayer(key.def.toLayer);
      return;
    }

    const touch: PhoneTouch = { key };
    this.phoneTouches.set(event.pointerId, touch);
    this.heldPhoneKeys.add(key);
    if (key.def.alternates?.length) {
      touch.timer = window.setTimeout(() => this.openAlternates(touch), LONG_PRESS_MS);
      this.refreshKeys();
      return;
    }
    const glyph = this.phoneGlyph(key);
    if (glyph !== undefined && this.isWordStart() && isArabicVowel(glyph)) {
      const hamza = this.pressPhoneKey(key, 'ئ');
      if (hamza) this.releasePhoneKey(hamza, false);
    }
    touch.pressed = this.pressPhoneKey(key, glyph);
    // iOS goes back to the letters after a space typed on the 123 page.
    if (key.def.kind === 'space' && key.layer === 'symbols') this.showPhoneLayer('letters');
  }

  /**
   * Marks the next letter as the start of a word: word and sentence levels call it as each word
   * or sentence begins. Until the level accepts a letter, vowel keys show and type their ئ.
   */
  public setWordStart(wordStart: boolean) {
    if (this.wordStart === wordStart) return;
    this.wordStart = wordStart;
    this.refreshHint();
    this.refreshKeys();
  }

  /**
   * Levels accept a key by lighting it green; a wrong key leaves the word where it was. In a
   * sentence, an accepted space or other non-letter starts the next word.
   */
  private onKeyAccepted() {
    this.lastTypedCode = '';
    // Spaces start words, and so do quotes, brackets and hyphens: «ئانا» starts at ئ.
    const startsWord = this.lastTypedText !== '' && !/\p{L}/u.test(this.lastTypedText);
    this.setWordStart(this.text === 'sentences' && startsWord);
  }

  /** Like iOS, a vowel key types the ئ a vowel takes at the start of a word. */
  private isWordStart() {
    return this.phoneScript === 'Arabic' && this.wordStart;
  }

  /** What a tap on `key` types now: its Shift glyph while Shift is on. */
  private phoneGlyph(key: PhoneKeyCap) {
    const { glyph, shiftGlyph } = key.def;
    return this.isPhoneShifted() && shiftGlyph ? shiftGlyph : glyph;
  }

  private onPhonePointerMove(event: FederatedPointerEvent) {
    const popup = this.phoneTouches.get(event.pointerId)?.popup;
    popup?.selectAt(event.getLocalPosition(this.panel).x);
  }

  private onPhoneKeyUp(event: FederatedPointerEvent, cancelled: boolean) {
    const touch = this.phoneTouches.get(event.pointerId);
    if (!touch) return;
    this.phoneTouches.delete(event.pointerId);
    window.clearTimeout(touch.timer);

    this.heldPhoneKeys.delete(touch.key);
    if (touch.pressed) {
      this.releasePhoneKey(touch.pressed);
      this.refreshKeys();
      return;
    }

    const { alternates } = touch.key.def;
    const chosen =
      touch.popup && alternates ? alternates[touch.popup.selected] : this.phoneGlyph(touch.key);
    touch.popup?.destroy({ children: true });
    if (!cancelled) {
      const pressed = this.pressPhoneKey(touch.key, chosen);
      if (pressed) this.releasePhoneKey(pressed);
    }
    this.refreshKeys();
  }

  private openAlternates(touch: PhoneTouch) {
    touch.timer = undefined;
    const { key } = touch;
    if (!key.def.alternates || !this.phoneScript) return;
    touch.popup = new AlternatesPopup(
      key.def.alternates,
      key,
      this.phoneScript,
      this.phoneColors(),
      this.phoneFontSize(),
      this.isPhoneUpperCase(),
      this.panelWidth,
    );
    touch.popup.eventMode = 'none';
    this.panel.addChild(touch.popup);
  }

  private cancelPhoneTouches() {
    for (const touch of this.phoneTouches.values()) {
      window.clearTimeout(touch.timer);
      touch.popup?.destroy({ children: true });
    }
    this.phoneTouches.clear();
    this.heldPhoneKeys.clear();
  }

  /** Phone Shift: a tap shifts one key, a double tap locks it, a tap while locked unlocks. */
  private tapPhoneShift() {
    const now = performance.now();
    if (this.capsLockOn) {
      this.capsLockOn = false;
      this.releaseLatchedShift();
    } else if (this.latchedShiftCode) {
      const doubleTap = now - this.lastShiftTapAt < SHIFT_DOUBLE_TAP_MS;
      this.releaseLatchedShift();
      this.capsLockOn = doubleTap;
    } else {
      this.latchedShiftCode = 'ShiftLeft';
      this.dispatchKey('keydown', 'ShiftLeft');
    }
    this.lastShiftTapAt = now;
    this.refreshHint();
    this.refreshKeys();
  }

  private phoneStroke(key: PhoneKeyCap, glyph?: string): Stroke | undefined {
    switch (key.def.kind) {
      case 'space':
        return { code: 'Space', shift: false };
      case 'enter':
        return { code: 'Enter', shift: false };
      case 'backspace':
        return { code: 'Backspace', shift: false };
      case 'char':
        return glyph ? getKeyStrokeFromChar(glyph) : undefined;
      default:
        return undefined;
    }
  }

  /**
   * Types `glyph` as the physical keystroke that makes it, so levels and the typing tutorial
   * see the real sequence. A Shift-layer glyph (ژ is Shift+D) under a locked Shift gets its own
   * Shift press; a glyph the phone shifts but the physical layout doesn't (ئ is a plain `/`)
   * goes out unshifted even with Shift on. Latin letters take their case from Shift.
   */
  private pressPhoneKey(key: PhoneKeyCap, glyph?: string): PressedStroke | undefined {
    const stroke = this.phoneStroke(key, glyph);
    if (!stroke) return undefined;
    this.lastPhoneKeyByCode.set(stroke.code, key);
    this.lastTypedCode = stroke.code;
    this.lastTypedText = key.def.kind === 'space' ? ' ' : (glyph ?? '');
    // Only a letter takes its case from Shift; punctuation on the letters page stays as shown.
    const cased =
      glyph !== undefined && glyph.toLocaleUpperCase('ug') !== glyph.toLocaleLowerCase('ug');
    const shiftKey = stroke.shift || (this.phoneScript === 'Latin' && cased && this.isShiftHeld());
    const wrappedShift = stroke.shift && !this.isShiftHeld();
    if (wrappedShift) this.dispatchKey('keydown', 'ShiftLeft');
    this.dispatchKey('keydown', stroke.code, shiftKey);
    return { code: stroke.code, shiftKey, wrappedShift };
  }

  private releasePhoneKey({ code, shiftKey, wrappedShift }: PressedStroke, releaseLatch = true) {
    this.dispatchKey('keyup', code, shiftKey);
    if (wrappedShift) this.dispatchKey('keyup', 'ShiftLeft');
    if (releaseLatch) this.releaseLatchedShift();
  }

  private releaseLatchedShift() {
    if (!this.latchedShiftCode) return;
    const code = this.latchedShiftCode;
    this.latchedShiftCode = '';
    this.dispatchKey('keyup', code);
    this.refreshHint();
  }

  /** Shift lights up in the hint only while it's still needed, so re-hint when it changes. */
  private refreshHint() {
    if (this.hintedLetter !== undefined) {
      this.setHintedLetter(this.hintedLetter, this.hintedNextLetter);
    }
  }

  private isShiftHeld() {
    return this.pressedCodes.has('ShiftLeft') || this.pressedCodes.has('ShiftRight');
  }

  private isPhoneUpperCase() {
    return this.phoneScript === 'Latin' && this.isShiftHeld() !== this.capsLockOn;
  }

  /**
   * Only Latin phone letters take case. In Arabic and Cyrillic a locked Shift just keeps the
   * Shift layer up.
   */
  private isPhoneShifted() {
    return this.isShiftHeld() || this.capsLockOn;
  }

  private dispatchKey(type: 'keydown' | 'keyup', code: string, shiftOverride?: boolean) {
    const shiftKey =
      shiftOverride ?? (SHIFT_CODES.has(code) ? type === 'keydown' : this.isShiftHeld());
    // The phone's Caps Lock only sets case in Latin; elsewhere it locks the Shift layer, and
    // passing it on would uppercase the Cyrillic letters the keys show in lowercase.
    const capsLock = this.capsLockOn && (this.mode !== 'phone' || this.phoneScript === 'Latin');
    window.dispatchEvent(
      new KeyboardEvent(type, {
        code,
        key: getEventKey(code, shiftKey, capsLock),
        shiftKey,
        modifierCapsLock: capsLock,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  private refreshKeys() {
    const shiftPressed = this.isShiftHeld();

    for (const cap of this.keys) {
      cap.setPressed(
        this.pressedCodes.has(cap.code) || (cap.code === 'CapsLock' && this.capsLockOn),
      );
      cap.setLabel(getKeyboardLabel(cap.code, shiftPressed, this.capsLockOn));
      cap.setHint(shiftPressed ? '' : getShiftHintLabel(cap.code));
    }

    if (this.phoneKeys.length === 0) return;
    const pressedPhoneKeys = new Set(this.heldPhoneKeys);
    for (const code of this.pressedCodes) {
      // Shift shows its state through the icon, not a held background.
      if (SHIFT_CODES.has(code)) continue;
      const key = this.phoneKeyForCode(code, shiftPressed);
      if (key) pressedPhoneKeys.add(key);
    }
    const shifted = this.isPhoneShifted();
    const upperCase = this.isPhoneUpperCase();
    const wordStart = this.isWordStart();
    for (const key of this.phoneKeys) {
      key.setPressed(pressedPhoneKeys.has(key));
      key.setShifted(shifted, upperCase, wordStart);
    }
    this.phoneKeyOfKind('shift')?.setShiftState(
      this.capsLockOn ? 'locked' : this.latchedShiftCode ? 'once' : 'off',
    );
  }
}
