import { FancyButton } from '@pixi/ui';
import { Container, Sprite, Texture } from 'pixi.js';

const BUTTON_ASSET = 'ui/next-button.svg';
const BUTTON_GAP = 16;
const BUTTON_SIZE_FALLBACK = 123;
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
  });
  button.anchor.set(0.5);
  button.onPress.connect(onPress);
  return button;
}

function navButtonStride() {
  const width = Texture.from(BUTTON_ASSET).width;
  return (width > 0 ? width : BUTTON_SIZE_FALLBACK) + BUTTON_GAP;
}

/** Previous/next letter controls, clustered around the existing top-right next slot. */
export function createLetterNavButtons(handlers: { onPrev: () => void; onNext: () => void }) {
  const nextButton = createButton(false, handlers.onNext);
  nextButton.layout = { position: 'absolute', top: '10%', left: '95%' };

  const prevButton = createButton(true, handlers.onPrev);
  prevButton.layout = {
    position: 'absolute',
    top: '10%',
    left: '95%',
    marginLeft: -navButtonStride(),
  };

  return { prevButton, nextButton };
}
