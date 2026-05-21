import { FancyButton } from '@pixi/ui';
import { Container, Graphics, Text } from 'pixi.js';

const SIZE = 64;
const BASE_COLOR = 0xf3ca8a;
const HOVER_COLOR = 0xf8dbaa;
const PRESS_COLOR = 0xe0b87a;

type CircleButtonOptions = {
  label: string;
  fontSize?: number;
  onPress: () => void;
};

function createCircleView(color: number) {
  const view = new Container();
  const shadow = new Graphics()
    .circle(SIZE / 2 + 2, SIZE / 2 + 4, SIZE / 2)
    .fill({ color: 0x000000, alpha: 0.18 });
  const background = new Graphics().circle(SIZE / 2, SIZE / 2, SIZE / 2).fill(color);

  view.addChild(shadow, background);
  return view;
}

export class CircleButton extends FancyButton {
  constructor({ label, fontSize = 28, onPress }: CircleButtonOptions) {
    super({
      defaultView: createCircleView(BASE_COLOR),
      hoverView: createCircleView(HOVER_COLOR),
      pressedView: createCircleView(PRESS_COLOR),
      text: new Text({
        text: label,
        style: {
          fontFamily: 'Concert One',
          fontSize,
          fontWeight: '800',
          fill: 0x5d4037,
        },
      }),
      anchor: 0.5,
      contentFittingMode: 'none',
      animations: {
        hover: {
          props: { scale: { x: 1.05, y: 1.05 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.95, y: 0.95 } },
          duration: 100,
        },
      },
    });

    this.onPress.connect(onPress);
    this.layout = true;
  }
}
