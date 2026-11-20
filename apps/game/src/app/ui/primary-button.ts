import { FancyButton } from '@pixi/ui';
import { Graphics, Text, type TextDropShadow } from 'pixi.js';

import { DISPLAY_FONT_FAMILY } from '../../utils/fonts';

/** The soft dark shadow white text wears over the home backdrop. */
export const BACKDROP_TEXT_SHADOW: Partial<TextDropShadow> = {
  color: 0x000000,
  blur: 5,
  distance: 0,
  alpha: 0.75,
};

const FILL = 0x2a523c;
const SHADOW_ALPHA = 0.7;
const TEXT_FILL = 0xfdf7e7;
const HOVER_SCALE = 1.1;
const PRESSED_SCALE = 0.9;

type PrimaryButtonOptions = {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  radius: number;
  /** How far the drop shadow sits below the face. */
  shadowOffset: number;
  /** Room kept around the label, which shrinks to fit inside it. */
  padding?: number;
  hoverScale?: number;
  pressedScale?: number;
};

/** The green call-to-action button of the home and course error screens. */
export function createPrimaryButton({
  text,
  width,
  height,
  fontSize,
  radius,
  shadowOffset,
  padding,
  hoverScale = HOVER_SCALE,
  pressedScale = PRESSED_SCALE,
}: PrimaryButtonOptions): FancyButton {
  const button = new FancyButton({
    defaultView: new Graphics()
      .roundRect(0, shadowOffset, width, height, radius)
      .fill({ color: 0x000000, alpha: SHADOW_ALPHA })
      .roundRect(0, 0, width, height, radius)
      .fill(FILL),
    padding,
    text: new Text({
      text,
      style: { fill: TEXT_FILL, fontSize, fontFamily: DISPLAY_FONT_FAMILY, fontWeight: '700' },
    }),
    animations: {
      hover: { props: { scale: { x: hoverScale, y: hoverScale } }, duration: 100 },
      pressed: { props: { scale: { x: pressedScale, y: pressedScale } }, duration: 100 },
    },
    anchor: 0.5,
  });
  // A leaf, so layout sizes the button without repositioning its anchored views.
  button.layout = { width, height, isLeaf: true };
  return button;
}
