import { Container, Graphics, Sprite, Texture } from 'pixi.js';

/** Finger tip positions in `hands.png` pixel space (765×289). */
export type Finger =
  | 'leftPinky'
  | 'leftRing'
  | 'leftMiddle'
  | 'leftIndex'
  | 'rightIndex'
  | 'rightMiddle'
  | 'rightRing'
  | 'rightPinky';

/** Tip-pad anchors in the hands asset (top-down view; thumbs toward center). */
const FINGER_TIPS: Record<Finger, { x: number; y: number }> = {
  leftPinky: { x: 39, y: 210 },
  leftRing: { x: 119, y: 81 },
  leftMiddle: { x: 191, y: 48 },
  leftIndex: { x: 267, y: 76 },
  rightIndex: { x: 497, y: 76 },
  rightMiddle: { x: 573, y: 48 },
  rightRing: { x: 645, y: 81 },
  rightPinky: { x: 723, y: 210 },
};

const HANDS_WIDTH = 765;
const HANDS_HEIGHT = 280;
const HANDS_TARGET_WIDTH_FACTOR = 0.6;
const HANDS_MAX_WIDTH = 820;
const INDICATOR_ACTIVE_COLOR = 0xff2d2d;
const INDICATOR_SUCCESS_COLOR = 0x8ec24d;
const INDICATOR_RADIUS = 10;

/** Standard touch-typing finger for each physical key code. */
const KEY_FINGER: Record<string, Finger> = {
  Backquote: 'leftPinky',
  Digit1: 'leftPinky',
  Digit2: 'leftRing',
  Digit3: 'leftMiddle',
  Digit4: 'leftIndex',
  Digit5: 'leftIndex',
  Digit6: 'rightIndex',
  Digit7: 'rightIndex',
  Digit8: 'rightMiddle',
  Digit9: 'rightRing',
  Digit0: 'rightPinky',
  Minus: 'rightPinky',
  Equal: 'rightPinky',
  Backspace: 'rightPinky',

  Tab: 'leftPinky',
  KeyQ: 'leftPinky',
  KeyW: 'leftRing',
  KeyE: 'leftMiddle',
  KeyR: 'leftIndex',
  KeyT: 'leftIndex',
  KeyY: 'rightIndex',
  KeyU: 'rightIndex',
  KeyI: 'rightMiddle',
  KeyO: 'rightRing',
  KeyP: 'rightPinky',
  BracketLeft: 'rightPinky',
  BracketRight: 'rightPinky',
  Backslash: 'rightPinky',

  CapsLock: 'leftPinky',
  KeyA: 'leftPinky',
  KeyS: 'leftRing',
  KeyD: 'leftMiddle',
  KeyF: 'leftIndex',
  KeyG: 'leftIndex',
  KeyH: 'rightIndex',
  KeyJ: 'rightIndex',
  KeyK: 'rightMiddle',
  KeyL: 'rightRing',
  Semicolon: 'rightPinky',
  Quote: 'rightPinky',
  Enter: 'rightPinky',

  ShiftLeft: 'leftPinky',
  KeyZ: 'leftPinky',
  KeyX: 'leftRing',
  KeyC: 'leftMiddle',
  KeyV: 'leftIndex',
  KeyB: 'leftIndex',
  KeyN: 'rightIndex',
  KeyM: 'rightIndex',
  Comma: 'rightMiddle',
  Period: 'rightRing',
  Slash: 'rightPinky',
  ShiftRight: 'rightPinky',
};

export function getFingerForKey(code: string): Finger | undefined {
  return KEY_FINGER[code];
}

export class HandGuide extends Container {
  private readonly hands: Sprite;
  private readonly indicator: Graphics;
  private viewWidth = 0;
  private viewHeight = 0;
  private activeFinger: Finger | undefined;
  private readonly completedFingers = new Set<Finger>();

  constructor() {
    super();
    this.hands = new Sprite({
      texture: Texture.from('typing-levels/typing-tutorial/hands.png'),
    });
    this.indicator = new Graphics();
    this.indicator.visible = false;
    this.addChild(this.hands, this.indicator);
  }

  public resize(viewWidth: number, viewHeight: number) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.layoutHands();
  }

  /** Red = next key to press; green = correctly pressed (stays until clear). */
  public setGuide(activeCode: string | undefined, completedCodes: readonly string[] = []) {
    this.activeFinger = activeCode ? getFingerForKey(activeCode) : undefined;
    this.completedFingers.clear();
    for (const code of completedCodes) {
      const finger = getFingerForKey(code);
      if (finger) this.completedFingers.add(finger);
    }
    this.redrawIndicators();
  }

  public clear() {
    this.activeFinger = undefined;
    this.completedFingers.clear();
    this.indicator.clear();
    this.indicator.visible = false;
  }

  private redrawIndicators() {
    this.indicator.clear();

    for (const finger of this.completedFingers) {
      if (finger === this.activeFinger) continue;
      const tip = FINGER_TIPS[finger];
      this.indicator
        .circle(tip.x, tip.y, INDICATOR_RADIUS)
        .fill({ color: INDICATOR_SUCCESS_COLOR });
    }

    if (this.activeFinger) {
      const tip = FINGER_TIPS[this.activeFinger];
      this.indicator.circle(tip.x, tip.y, INDICATOR_RADIUS).fill({ color: INDICATOR_ACTIVE_COLOR });
    }

    this.indicator.visible = this.activeFinger !== undefined || this.completedFingers.size > 0;
  }

  private layoutHands() {
    // Sit under the keyboard, centered; scale to ~keyboard letter-key span.
    const targetWidth = Math.min(this.viewWidth * HANDS_TARGET_WIDTH_FACTOR, HANDS_MAX_WIDTH);
    const scale = targetWidth / HANDS_WIDTH;
    this.scale.set(scale);
    this.position.set(
      Math.round((this.viewWidth - HANDS_WIDTH * scale) / 2),
      Math.round(this.viewHeight - HANDS_HEIGHT * scale - 8),
    );
  }
}
