import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, Text } from 'pixi.js';

import { getMappedFromKeyCode } from '../../utils/keymap';

type Key = {
  code: string;
  width?: number;
};

const qwerty: Key[][] = [
  [
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
    { code: 'Backspace' },
  ],
  [
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
  ],
  [
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
  ],
  [
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
const INSET_SHADOW = 10; // shadow-[inset_0_-10px_0_#c98144]
const FONT_SIZE = 30; // text-3xl
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

  constructor(code: string, widthMultiplier = 1) {
    super();
    this.code = code;
    this.keyWidth = UNIT * widthMultiplier;

    this.keyLabel = new Text({
      text: '',
      resolution: 2,
      style: {
        align: 'center',
        fill: TEXT_COLOR,
        fontFamily: `'Noto Sans Arabic', 'Noto Sans'`,
        fontSize: FONT_SIZE,
        fontWeight: '700',
        lineHeight: FONT_SIZE,
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
  private readonly panelShadow = new Graphics();
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

    const rows = qwerty.map((row) => {
      const caps = row.map(({ code, width }) => {
        const cap = new KeyCap(code, width);
        cap.setLabel(getMappedFromKeyCode(code, shiftPressed));
        this.keys.push(cap);
        return cap;
      });

      const rowWidth =
        caps.reduce((sum, cap) => sum + cap.keyWidth, 0) + KEY_GAP * (caps.length - 1);
      maxRowWidth = Math.max(maxRowWidth, rowWidth);

      return { caps, rowWidth };
    });

    this.panelWidth = maxRowWidth + PANEL_PADDING * 2;
    this.panelHeight = qwerty.length * UNIT + ROW_GAP * (qwerty.length - 1) + PANEL_PADDING * 2;

    this.drawPanelBackground();
    this.panel.addChild(this.panelShadow, this.panelBackground);

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
    this.panelShadow
      .clear()
      .roundRect(0, 0, this.panelWidth, this.panelHeight, PANEL_RADIUS)
      .fill({ color: PANEL_SHADOW_COLOR });

    this.panelBackground
      .clear()
      .roundRect(0, 0, this.panelWidth, this.panelHeight - INSET_SHADOW, PANEL_RADIUS)
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
      cap.setLabel(getMappedFromKeyCode(cap.code, shiftPressed));
    }
  }
}
