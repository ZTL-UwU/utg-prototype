import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, type FederatedPointerEvent, Graphics, Text } from 'pixi.js';

import { responsive, safeAreaInsets } from '../../engine/utils/viewport';
import {
  getKeyFromChar,
  getKeyboardLabel,
  getMappedFromKeyCode,
  getShiftHintLabel,
  isAuxiliaryKey,
} from '../../utils/keymap';
import { getScriptFontFamily } from '../../utils/script';

export type KeyFeedback = 'none' | 'hint' | 'error' | 'error-soft' | 'success';

type Key = {
  code: string;
  width?: number;
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
const PHONE_SIDE_MARGIN = 4; // CSS pixels
const ENTER_Y_OFFSET = 72;
const EXIT_Y_OFFSET = 48;

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

type PanelLayout = {
  rows: Key[][];
  /** Stretch every row to the available width instead of using `UNIT`-wide keys. */
  fillWidth: boolean;
  unitHeight: number;
  keyGap: number;
  rowGap: number;
  padding: number;
  bottomMargin: number;
  labelScale: number;
};

const REGULAR_LAYOUT: PanelLayout = {
  rows: keyboardLayout,
  fillWidth: false,
  unitHeight: UNIT,
  keyGap: KEY_GAP,
  rowGap: ROW_GAP,
  padding: PANEL_PADDING,
  bottomMargin: BOTTOM_MARGIN,
  labelScale: 1,
};

const letterRow = (codes: string): Key[] => codes.split(' ').map((code) => ({ code }));

/** A phone is too narrow for 15 keys across, so the rarely used keys move to the bottom row. */
const PHONE_LAYOUT: PanelLayout = {
  rows: [
    letterRow('Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal'),
    letterRow('KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP'),
    letterRow('KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote'),
    [
      { code: 'ShiftLeft', width: 1.3 },
      ...letterRow('KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash'),
      { code: 'ShiftRight', width: 1.3 },
    ],
    [
      { code: 'CapsLock', width: 1.5 },
      ...letterRow('Backquote BracketLeft BracketRight Backslash'),
      { code: 'Space', width: 3.5 },
      { code: 'Enter', width: 1.5 },
      { code: 'Backspace', width: 1.5 },
    ],
  ],
  fillWidth: true,
  unitHeight: 86,
  keyGap: 6,
  rowGap: 6,
  padding: 10,
  bottomMargin: 24,
  labelScale: 1.5,
};

const KEY_SUCCESS_COLOR = 0x8ec24d;
const KEY_ERROR_COLOR = 0xef5a42;
// Lighter red so a heatmap can rank problem keys against the worst ones.
const KEY_ERROR_SOFT_COLOR = 0xf6907c;
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

class KeyCap extends Container {
  public readonly code: string;
  public keyWidth: number;

  private keyHeight = UNIT;
  private homeBump?: Graphics;
  private readonly isAuxiliary: boolean;
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
    this.isAuxiliary = isAuxiliary;
    this.keyWidth = UNIT;

    const isShift = SHIFT_CODES.has(code);

    this.keyLabel = new Text({
      text: '',
      resolution: 2,
      style: {
        align: 'center',
        fill: isShift ? shiftHintColor : textColor,
        fontFamily: isAuxiliary ? 'Concert One' : getScriptFontFamily(),
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

    // REFACTORED COLOR ASSIGNMENTS
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

  public applySize(keyWidth: number, keyHeight: number, labelScale: number) {
    this.keyWidth = keyWidth;
    this.keyHeight = keyHeight;

    // Auxiliary labels are words, already as wide as the keys that carry them.
    const fontSize = this.isAuxiliary ? 26 : 30 * labelScale;
    this.keyLabel.style.fontSize = fontSize;
    this.keyLabel.style.lineHeight = fontSize;
    this.keyLabel.position.set(keyWidth / 2, keyHeight / 2);

    const hintFontSize = SHIFT_HINT_FONT_SIZE * labelScale;
    this.hintLabel.style.fontSize = hintFontSize;
    this.hintLabel.style.lineHeight = hintFontSize;

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
    const fillColor =
      this.feedback === 'success'
        ? KEY_SUCCESS_COLOR
        : this.feedback === 'error'
          ? KEY_ERROR_COLOR
          : this.feedback === 'error-soft'
            ? KEY_ERROR_SOFT_COLOR
            : this.feedback === 'hint'
              ? this.keyPressedColor
              : this.pressed
                ? this.keyPressedColor
                : this.keyColor;

    this.background
      .clear()
      .roundRect(0, 0, this.keyWidth, this.keyHeight, KEY_RADIUS)
      .fill({ color: fillColor });
  }
}

export class KeyboardLayout extends Container {
  private readonly panel = new Container();
  private readonly panelBackground = new Graphics();
  private readonly keys: KeyCap[] = [];
  private readonly keyByCode = new Map<string, KeyCap>();
  private readonly pressedCodes = new Set<string>();
  private readonly keyboardColorOptions;
  private hintedCode = '';
  /** Code held by each pointer tapping the on-screen keys. */
  private readonly tappedCodes = new Map<number, string>();
  /** Tapped Shift stays held until the next key tap, like a phone keyboard. */
  private latchedShiftCode = '';
  /** Caps Lock toggle, synced from the OS state on every physical key event. */
  private capsLockOn = false;
  /** Last known OS Caps Lock state; differs from `capsLockOn` after a tap on CAPS. */
  private osCapsLockOn = false;

  private listening = false;

  private appliedLayout?: PanelLayout;
  private appliedWidth = 0;
  private panelWidth = 0;
  private panelHeight = 0;
  private enterExitAnimation?: AnimationPlaybackControls;

  constructor(keyboardColorOptions: KeyboardColorOptions = DEFAULT_COLOR_OPTIONS) {
    super();
    this.keyboardColorOptions = keyboardColorOptions;
    this.buildPanel();
    this.layoutPanel(REGULAR_LAYOUT, 0);
    this.panel.alpha = 0;
    this.addChild(this.panel);
    this.applyHiddenPose();
    this.setListening(true);
  }

  /** Center horizontally and pin to the bottom of the given view size. */
  public resize(viewWidth: number, viewHeight: number, bottomMargin?: number) {
    const layout = responsive({ sm: PHONE_LAYOUT, lg: REGULAR_LAYOUT });
    const { left, right, bottom } = safeAreaInsets();
    const widthFactor = responsive({
      sm: 1 - (2 * Math.max(left, right) + 2 * PHONE_SIDE_MARGIN) / window.innerWidth,
      lg: MAX_WIDTH_FACTOR,
    });
    this.layoutPanel(layout, viewWidth * widthFactor);

    // Insets are CSS pixels, the view isn't.
    const safeBottom = (bottom / window.innerHeight) * viewHeight;
    const margin = bottomMargin ?? Math.max(layout.bottomMargin, safeBottom);
    const scale = Math.min(1, (viewWidth * widthFactor) / this.panelWidth);
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
  }

  public clearKeyFeedback(code: string) {
    this.setKeyFeedback(code, 'none');
  }

  /** Highlights the physical key for `letter` as a hint; pass undefined to clear it. */
  public setHintedLetter(letter?: string) {
    if (this.hintedCode) this.clearKeyFeedback(this.hintedCode);
    this.hintedCode = letter ? getKeyFromChar(letter) : '';
    if (this.hintedCode) this.setKeyFeedback(this.hintedCode, 'hint');
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.enterExitAnimation?.stop();
    this.setListening(false);
    super.destroy(options);
  }

  private buildPanel() {
    const shiftPressed = false;

    this.panel.addChild(this.panelBackground);

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
      this.panel.addChild(cap);
    }
  }

  /** Arrange the keys for `layout`; a no-op when nothing changed, since `resize` runs often. */
  private layoutPanel(layout: PanelLayout, availableWidth: number) {
    if (this.appliedLayout === layout && this.appliedWidth === availableWidth) return;
    this.appliedLayout = layout;
    this.appliedWidth = availableWidth;

    const { rows, fillWidth, unitHeight, keyGap, rowGap, padding, labelScale } = layout;
    const unitWidthOf = (row: Key[]) => {
      if (!fillWidth) return UNIT;
      const units = row.reduce((sum, key) => sum + (key.width ?? 1), 0);
      return (availableWidth - padding * 2 - keyGap * (row.length - 1)) / units;
    };
    const rowWidthOf = (row: Key[]) =>
      row.reduce((sum, key) => sum + unitWidthOf(row) * (key.width ?? 1), 0) +
      keyGap * (row.length - 1);

    const panelWidth = Math.max(...rows.map(rowWidthOf)) + padding * 2;
    const panelHeight = rows.length * unitHeight + rowGap * (rows.length - 1) + padding * 2;
    this.drawPanelBackground(panelWidth, panelHeight);

    // Keys a layout leaves out (spacers, Tab) stay built but hidden, so spacers match by turn.
    this.keys.forEach((cap) => (cap.visible = false));
    const spacers = this.keys.filter((cap) => cap.code === '');

    rows.forEach((row, rowIndex) => {
      const unitWidth = unitWidthOf(row);
      let x = (panelWidth - rowWidthOf(row)) / 2;
      const y = padding + rowIndex * (unitHeight + rowGap);

      for (const { code, width = 1 } of row) {
        const cap = code ? this.keyByCode.get(code) : spacers.shift();
        if (!cap) continue;
        cap.visible = true;
        cap.applySize(unitWidth * width, unitHeight, labelScale);
        cap.position.set(x, y);
        x += cap.keyWidth + keyGap;
      }
    });

    this.panelWidth = panelWidth;
    this.panelHeight = panelHeight;
  }

  private drawPanelBackground(panelWidth: number, panelHeight: number) {
    this.panelBackground
      .clear()
      .roundRect(0, 12, panelWidth, panelHeight, PANEL_RADIUS)
      .fill({ color: this.keyboardColorOptions.PANEL_SHADOW_COLOR, alpha: 0.7 })
      .roundRect(0, 0, panelWidth, panelHeight, PANEL_RADIUS)
      .fill({ color: this.keyboardColorOptions.PANEL_COLOR });
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
    if (!this.listening || this.panel.alpha === 0 || this.tappedCodes.has(event.pointerId)) return;

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

  private releaseLatchedShift() {
    if (!this.latchedShiftCode) return;
    const code = this.latchedShiftCode;
    this.latchedShiftCode = '';
    this.dispatchKey('keyup', code);
  }

  private dispatchKey(type: 'keydown' | 'keyup', code: string) {
    const shiftKey = SHIFT_CODES.has(code)
      ? type === 'keydown'
      : this.pressedCodes.has('ShiftLeft') || this.pressedCodes.has('ShiftRight');
    window.dispatchEvent(
      new KeyboardEvent(type, {
        code,
        key: getEventKey(code, shiftKey, this.capsLockOn),
        shiftKey,
        modifierCapsLock: this.capsLockOn,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  private refreshKeys() {
    const shiftPressed = this.pressedCodes.has('ShiftLeft') || this.pressedCodes.has('ShiftRight');

    for (const cap of this.keys) {
      cap.setPressed(
        this.pressedCodes.has(cap.code) || (cap.code === 'CapsLock' && this.capsLockOn),
      );
      cap.setLabel(getKeyboardLabel(cap.code, shiftPressed, this.capsLockOn));
      cap.setHint(shiftPressed ? '' : getShiftHintLabel(cap.code));
    }
  }
}
