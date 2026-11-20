import { FancyButton } from '@pixi/ui';
import { EDUCATION_LETTERS, type EducationLetter } from '@utg/letters';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import { isPhone, safeAreaInsetsInView } from '../../engine/utils/viewport';

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

  if (!isPhone()) {
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

  const top = safeAreaInsetsInView(height).top + PHONE_CONTROL_INSET;
  closeButton.layout = { position: 'absolute', top, left: PHONE_CONTROL_INSET };
  nextButton.layout = { position: 'absolute', top, left: width - PHONE_CONTROL_INSET };
  prevButton.layout = { position: 'absolute', top, left: width - PHONE_CONTROL_INSET - stride };
  return top + halfHeight;
}

/** The letter `delta` places after `letter` in the alphabet, wrapping at both ends. */
export function getAdjacentLetter(letter: string, delta: number): string {
  const index = EDUCATION_LETTERS.indexOf(letter as EducationLetter);
  if (index < 0) return EDUCATION_LETTERS[0]!;
  const count = EDUCATION_LETTERS.length;
  return EDUCATION_LETTERS[(index + delta + count) % count]!;
}

/**
 * The letter step a key press asks for: 1 for the right arrow, -1 for the left, or undefined
 * for anything else. Claims the arrows so the page does not scroll; held arrows step once.
 */
export function getArrowLetterStep(event: KeyboardEvent): 1 | -1 | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return undefined;
  event.preventDefault();
  if (event.repeat) return undefined;
  return event.key === 'ArrowRight' ? 1 : -1;
}

/** A letter popup's close button, drawn from `asset`: clicks, then runs `onClose`. */
export function createLetterPopupCloseButton(asset: string, onClose: () => void) {
  const button = new FancyButton({ defaultView: asset, animations: BUTTON_ANIMATIONS });
  button.anchor.set(0.5);
  button.onPress.connect(() => {
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
    onClose();
  });
  return button;
}
