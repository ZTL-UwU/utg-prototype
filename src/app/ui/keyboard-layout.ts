import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

import { getKeyboardLabel, getShiftHintLabel } from '../../utils/keymap';

export type KeyFeedback = 'none' | 'hint' | 'error' | 'success';

type Key = {
  code: string;
  width?: number;
  auxiliary?: boolean;
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
    { code: 'Backquote', auxiliary: true },
    { code: 'Digit1', auxiliary: true },
    { code: 'Digit2', auxiliary: true },
    { code: 'Digit3', auxiliary: true },
    { code: 'Digit4', auxiliary: true },
    { code: 'Digit5', auxiliary: true },
    { code: 'Digit6', auxiliary: true },
    { code: 'Digit7', auxiliary: true },
    { code: 'Digit8', auxiliary: true },
    { code: 'Digit9', auxiliary: true },
    { code: 'Digit0', auxiliary: true },
    { code: 'Minus', auxiliary: true },
    { code: 'Equal', auxiliary: true },
    { code: 'Backspace', width: 1.7, auxiliary: true },
  ],
  [
    { code: 'Tab', width: 1.7, auxiliary: true },
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
    { code: 'BracketLeft', auxiliary: true },
    { code: 'BracketRight', auxiliary: true },
    { code: 'Backslash', auxiliary: true },
  ],
  [
    { code: 'CapsLock', width: 2.05, auxiliary: true },
    { code: 'KeyA' },
    { code: 'KeyS' },
    { code: 'KeyD' },
    { code: 'KeyF' },
    { code: 'KeyG' },
    { code: 'KeyH' },
    { code: 'KeyJ' },
    { code: 'KeyK' },
    { code: 'KeyL' },
    { code: 'Semicolon', auxiliary: true },
    { code: 'Quote', auxiliary: true },
    { code: 'Enter', width: 1.8, auxiliary: true },
  ],
  [
    { code: 'ShiftLeft', width: 2.5, auxiliary: true },
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
    { code: 'ShiftRight', width: 2.45, auxiliary: true },
  ],
  [
    { code: '' },
    { code: '' },
    { code: '' },
    { code: '' },
    { code: 'Space', width: 6, auxiliary: true },
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

const KEY_SUCCESS_COLOR = 0x8ec24d;
const KEY_ERROR_COLOR = 0xef5a42;
const SHIFT_HINT_PADDING = 6;
const SHIFT_HINT_FONT_SIZE = 22;

class KeyCap extends Container {
  public readonly code: string;
  public readonly keyWidth: number;

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
    widthMultiplier = 1,
    isAuxiliary = false,
    textColor = TEXT_COLOR,
    keyColor = KEY_COLOR,
    keyPressedColor = KEY_PRESSED_COLOR,
    shiftHintColor = SHIFT_HINT_COLOR,
  ) {
    super();
    this.code = code;
    this.keyWidth = UNIT * widthMultiplier;

    const isShift = code === 'ShiftLeft' || code === 'ShiftRight';

    this.keyLabel = new Text({
      text: '',
      resolution: 2,
      style: {
        align: 'center',
        fill: isShift ? shiftHintColor : textColor,
        fontFamily: isAuxiliary ? 'Concert One' : 'Noto Naskh Arabic Bold',
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
        fontFamily: 'Noto Naskh Arabic Bold',
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
    this.addChild(this.background, this.keyContent);
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
          : this.feedback === 'hint'
            ? this.keyPressedColor
            : this.pressed
              ? this.keyPressedColor
              : this.keyColor;

    this.background
      .clear()
      .roundRect(0, 0, this.keyWidth, UNIT, KEY_RADIUS)
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

  private listening = false;

  private readonly panelWidth: number;
  private readonly panelHeight: number;
  private enterExitAnimation?: AnimationPlaybackControls;

  constructor(keyboardColorOptions: KeyboardColorOptions = DEFAULT_COLOR_OPTIONS) {
    super();
    this.keyboardColorOptions = keyboardColorOptions;
    const { width, height } = this.buildPanel();
    this.panelWidth = width;
    this.panelHeight = height;
    this.panel.alpha = 0;
    this.addChild(this.panel);
    this.applyHiddenPose();
    this.setListening(true);
  }

  /** Center horizontally and pin to the bottom of the given view size. */
  public resize(viewWidth: number, viewHeight: number, bottomMargin = BOTTOM_MARGIN) {
    const scale = Math.min(1, (viewWidth * MAX_WIDTH_FACTOR) / this.panelWidth);
    this.scale.set(scale);
    this.position.set(
      Math.round((viewWidth - this.panelWidth * scale) / 2),
      Math.round(viewHeight - bottomMargin - this.panelHeight * scale),
    );
  }

  public async pause() {
    this.setListening(false);
  }

  public async resume() {
    this.setListening(true);
  }

  public async playEnterAnimation() {
    this.enterExitAnimation?.stop();
    this.applyHiddenPose();

    this.enterExitAnimation = animate(
      this.panel,
      { alpha: 1, y: 0 },
      { duration: 0.4, ease: 'backOut' },
    );
    await this.enterExitAnimation.finished;
  }

  public async playExitAnimation() {
    this.enterExitAnimation?.stop();

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

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.enterExitAnimation?.stop();
    this.setListening(false);
    super.destroy(options);
  }

  private buildPanel() {
    const shiftPressed = false;
    let maxRowWidth = 0;

    const rows = keyboardLayout.map((row) => {
      const caps = row.map(({ code, width, auxiliary }) => {
        const cap = new KeyCap(
          code,
          width,
          auxiliary,
          this.keyboardColorOptions.TEXT_COLOR,
          this.keyboardColorOptions.KEY_COLOR,
          this.keyboardColorOptions.KEY_PRESSED_COLOR,
          this.keyboardColorOptions.SHIFT_HINT_COLOR,
        );
        cap.setLabel(getKeyboardLabel(code, shiftPressed));
        cap.setHint(getShiftHintLabel(code));
        this.keys.push(cap);
        if (code) {
          this.keyByCode.set(code, cap);
        }
        return cap;
      });

      const rowWidth =
        caps.reduce((sum, cap) => sum + cap.keyWidth, 0) + KEY_GAP * (caps.length - 1);
      maxRowWidth = Math.max(maxRowWidth, rowWidth);

      return { caps, rowWidth };
    });

    const panelWidth = maxRowWidth + PANEL_PADDING * 2;
    const panelHeight =
      keyboardLayout.length * UNIT + ROW_GAP * (keyboardLayout.length - 1) + PANEL_PADDING * 2;

    this.drawPanelBackground(panelWidth, panelHeight);
    this.panel.addChild(this.panelBackground);

    rows.forEach(({ caps, rowWidth }, rowIndex) => {
      let x = (panelWidth - rowWidth) / 2;
      const y = PANEL_PADDING + rowIndex * (UNIT + ROW_GAP);

      caps.forEach((cap) => {
        cap.position.set(x, y);
        this.panel.addChild(cap);
        x += cap.keyWidth + KEY_GAP;
      });
    });

    return { width: panelWidth, height: panelHeight };
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
    this.pressedCodes.add(event.code);
    this.refreshKeys();
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.pressedCodes.delete(event.code);
    this.refreshKeys();
  };

  private readonly onBlur = () => {
    this.pressedCodes.clear();
    this.refreshKeys();
  };

  private refreshKeys() {
    const shiftPressed = this.pressedCodes.has('ShiftLeft') || this.pressedCodes.has('ShiftRight');

    for (const cap of this.keys) {
      cap.setPressed(this.pressedCodes.has(cap.code));
      cap.setLabel(getKeyboardLabel(cap.code, shiftPressed));
      cap.setHint(shiftPressed ? '' : getShiftHintLabel(cap.code));
    }
  }
}
