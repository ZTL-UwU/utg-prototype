import { FancyButton } from '@pixi/ui';
import { Container, Graphics, Text } from 'pixi.js';

const SIZE = 96;
const BASE_COLOR = 0x1a2a6c;
const HOVER_COLOR = 0x243580;
const PRESS_COLOR = 0x12205e;

function createView(color: number) {
  const view = new Container();
  const shadow = new Graphics()
    .circle(SIZE / 2 + 2, SIZE / 2 + 4, SIZE / 2)
    .fill({ color: 0x000000, alpha: 0.2 });
  const bg = new Graphics().circle(SIZE / 2, SIZE / 2, SIZE / 2).fill(color);
  view.addChild(shadow, bg);
  return view;
}

function playLetterAudio(letter: string) {
  console.log('[audio stub] playing letter:', letter);
}

export class SoundButton extends FancyButton {
  private currentLetter = '';

  constructor() {
    super({
      defaultView: createView(BASE_COLOR),
      hoverView: createView(HOVER_COLOR),
      pressedView: createView(PRESS_COLOR),
      text: new Text({
        text: '🔊',
        style: {
          fontSize: 44,
          fill: 0xffffff,
        },
      }),
      anchor: 0.5,
      contentFittingMode: 'none',
      animations: {
        hover: { props: { scale: { x: 1.05, y: 1.05 } }, duration: 100 },
        pressed: { props: { scale: { x: 0.95, y: 0.95 } }, duration: 100 },
      },
    });

    this.onPress.connect(() => playLetterAudio(this.currentLetter));
  }

  setLetter(letter: string) {
    this.currentLetter = letter;
  }
}
