import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

import { getKeyboardLabel } from '../../utils/keymap';

type Key = {
  code: string;
  width?: number;
  auxiliary?: boolean;
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
const ENTER_Y_OFFSET = 72;
const EXIT_Y_OFFSET = 48;

const PANEL_COLOR = 0xf3ca8a;
const PANEL_SHADOW_COLOR = 0xc98144;
const KEY_COLOR = 0xc98144;
const KEY_PRESSED_COLOR = 0x8d6241;
const TEXT_COLOR = 0xffffff;

class KeyCap extends Container {
  public readonly code: string;
  public readonly keyWidth: number;

  private readonly background = new Graphics();
  private readonly keyLabel: Text;
  private pressed = false;

  constructor(code: string, widthMultiplier = 1, isAuxiliary = false) {
    super();
    this.code = code;
    this.keyWidth = UNIT * widthMultiplier;

    this.keyLabel = new Text({
      text: '',
      resolution: 2,
      style: {
        align: 'center',
        fill: TEXT_COLOR,
        fontFamily: isAuxiliary ? 'Concert One' : 'Noto Sans Arabic',
        fontSize: isAuxiliary ? 26 : 30,
        fontWeight: '800',
        lineHeight: isAuxiliary ? 26 : 30,
        padding: 30,
      },
    });
    this.keyLabel.anchor.set(0.5);
    this.keyLabel.position.set(this.keyWidth / 2, UNIT / 2);

    this.drawBackground();
    this.addChild(this.background, this.keyLabel);
  }

  public setPressed(pressed: boolean) {
    if (this.pressed === pressed) return;
    this.pressed = pressed;
    this.drawBackground();
  }

  public setLabel(text: string) {
    if (this.keyLabel.text === text) return;
    this.keyLabel.text = text;
  }

  private drawBackground() {
    this.background
      .clear()
      .roundRect(0, 0, this.keyWidth, UNIT, KEY_RADIUS)
      .fill({ color: this.pressed ? KEY_PRESSED_COLOR : KEY_COLOR });
  }
}

export class KeyboardLayout extends Container {
  private readonly panel = new Container();
  private readonly panelBackground = new Graphics();
  private readonly keys: KeyCap[] = [];

  private readonly pressedCodes = new Set<string>();
  private listening = false;

  private panelWidth = 0;
  private panelHeight = 0;
  private viewWidth = 0;
  private viewHeight = 0;
  private restX = 0;
  private restY = 0;
  private hidden = true;
  private enterExitAnimation?: AnimationPlaybackControls;

  constructor() {
    super();

    this.buildPanel();
    this.panel.alpha = 0;
    this.addChild(this.panel);
  }

  public async pause() {
    this.setListening(false);
  }

  public async resume() {
    this.setListening(true);
  }

  public async playEnterAnimation() {
    this.enterExitAnimation?.stop();
    this.hidden = false;
    this.applyHiddenPose();

    this.enterExitAnimation = animate(
      this.panel,
      { alpha: 1, y: this.restY },
      { duration: 0.4, ease: 'backOut' },
    );
    await this.enterExitAnimation.finished;
  }

  public async playExitAnimation() {
    this.enterExitAnimation?.stop();

    this.enterExitAnimation = animate(
      this.panel,
      { alpha: 0, y: this.restY + EXIT_Y_OFFSET },
      { duration: 0.2, ease: 'backIn' },
    );
    await this.enterExitAnimation.finished;
    this.hidden = true;
  }

  public resize(width: number, height: number) {
    this.viewWidth = width;
    this.viewHeight = height;
    this.layoutPanel();
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
        const cap = new KeyCap(code, width, auxiliary);
        cap.setLabel(getKeyboardLabel(code, shiftPressed));
        this.keys.push(cap);
        return cap;
      });

      const rowWidth =
        caps.reduce((sum, cap) => sum + cap.keyWidth, 0) + KEY_GAP * (caps.length - 1);
      maxRowWidth = Math.max(maxRowWidth, rowWidth);

      return { caps, rowWidth };
    });

    this.panelWidth = maxRowWidth + PANEL_PADDING * 2;
    this.panelHeight =
      keyboardLayout.length * UNIT + ROW_GAP * (keyboardLayout.length - 1) + PANEL_PADDING * 2;

    this.drawPanelBackground();
    this.panel.addChild(this.panelBackground);

    rows.forEach(({ caps, rowWidth }, rowIndex) => {
      let x = (this.panelWidth - rowWidth) / 2;
      const y = PANEL_PADDING + rowIndex * (UNIT + ROW_GAP);

      caps.forEach((cap) => {
        cap.position.set(x, y);
        this.panel.addChild(cap);
        x += cap.keyWidth + KEY_GAP;
      });
    });
  }

  private drawPanelBackground() {
    this.panelBackground
      .clear()
      .roundRect(0, 12, this.panelWidth, this.panelHeight, PANEL_RADIUS)
      .fill({ color: PANEL_SHADOW_COLOR })
      .roundRect(0, 0, this.panelWidth, this.panelHeight, PANEL_RADIUS)
      .fill({ color: PANEL_COLOR });
  }

  private layoutPanel() {
    this.restX = Math.round((this.viewWidth - this.panelWidth) / 2);
    this.restY = Math.round(this.viewHeight - BOTTOM_MARGIN - this.panelHeight);

    if (this.hidden) {
      this.applyHiddenPose();
      return;
    }

    this.panel.position.set(this.restX, this.restY);
  }

  private applyHiddenPose() {
    this.panel.position.set(this.restX, this.restY + ENTER_Y_OFFSET);
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
      this.refreshKeys();
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
    }
  }
}
