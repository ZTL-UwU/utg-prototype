import { FancyButton } from '@pixi/ui';
import { Container, Sprite, Texture } from 'pixi.js';

import { responsive, safeAreaInsets } from '../../engine/utils/viewport';

const BUTTON_ASSET = 'ui/next-button.svg';
const BUTTON_GAP = 16;
const BUTTON_SIZE_FALLBACK = 123;
const BUTTON_SCALE = 0.8;
/** Phones: distance from the screen edges (below the notch) to each control's center. */
const PHONE_CONTROL_INSET = 80;
const BUTTON_ANIMATIONS = {
  hover: { props: { scale: { x: 1.03, y: 1.03 } }, duration: 100 },
  pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
};

/** Flipping inside a wrapper keeps FancyButton's hit area valid. */
function createArrowView(pointLeft: boolean) {
  const texture = Texture.from(BUTTON_ASSET);
  const arrow = new Sprite({
    texture,
    anchor: 0.5,
    position: { x: texture.width / 2, y: texture.height / 2 },
  });
  if (pointLeft) {
    arrow.scale.x = -1;
  }
  return new Container({ children: [arrow] });
}

function createButton(pointLeft: boolean, onPress: () => void) {
  const button = new FancyButton({
    defaultView: createArrowView(pointLeft),
    animations: BUTTON_ANIMATIONS,
    scale: BUTTON_SCALE,
  });
  button.anchor.set(0.5);
  button.onPress.connect(onPress);
  return button;
}

function navButtonStride() {
  const width = Texture.from(BUTTON_ASSET).width;
  return (width > 0 ? width : BUTTON_SIZE_FALLBACK) * BUTTON_SCALE + BUTTON_GAP;
}

/** Previous/next letter controls; place them with `layoutLetterPopupControls` in `resize`. */
export function createLetterNavButtons(handlers: { onPrev: () => void; onNext: () => void }) {
  return {
    prevButton: createButton(true, handlers.onPrev),
    nextButton: createButton(false, handlers.onNext),
  };
}

/**
 * Places a letter popup's close button top-left and its prev/next pair top-right. Phones pin them
 * to the corners below the notch; larger screens keep them on the 10% line. Returns the bottom
 * edge of the controls, for content that has to start below them.
 */
export function layoutLetterPopupControls(
  controls: { closeButton: Container; prevButton: Container; nextButton: Container },
  width: number,
  height: number,
) {
  const { closeButton, prevButton, nextButton } = controls;
  const stride = navButtonStride();
  const halfHeight = Math.max(closeButton.height, stride - BUTTON_GAP) / 2;

  if (!responsive({ sm: true, lg: false })) {
    closeButton.layout = { position: 'absolute', top: '10%', left: '5%' };
    nextButton.layout = { position: 'absolute', top: '10%', left: '95%' };
    prevButton.layout = {
      position: 'absolute',
      top: '10%',
      left: '95%',
      marginLeft: -stride,
    };
    return height * 0.1 + halfHeight;
  }

  // Insets are CSS pixels, the view isn't
  const safeTop = (safeAreaInsets().top / window.innerHeight) * height;
  const top = safeTop + PHONE_CONTROL_INSET;
  closeButton.layout = { position: 'absolute', top, left: PHONE_CONTROL_INSET };
  nextButton.layout = { position: 'absolute', top, left: width - PHONE_CONTROL_INSET };
  prevButton.layout = { position: 'absolute', top, left: width - PHONE_CONTROL_INSET - stride };
  return top + halfHeight;
}
