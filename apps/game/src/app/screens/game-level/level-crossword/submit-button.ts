import { FancyButton } from '@pixi/ui';
import { Graphics, Text } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';

const BUTTON_WIDTH = 260;
const BUTTON_HEIGHT = 90;
const SHADOW_OFFSET = 10;

export class SubmitButton extends FancyButton {
  /** Full drawn height, shadow included. */
  public static readonly totalHeight = BUTTON_HEIGHT + SHADOW_OFFSET;

  constructor(onSubmit: () => void) {
    super({
      defaultView: new Graphics()
        .roundRect(0, SHADOW_OFFSET, BUTTON_WIDTH, BUTTON_HEIGHT, 30)
        .fill({ color: 0x7a5520 })
        .roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 30)
        .fill(0xa66129),
      text: new Text({
        text: 'SUBMIT',
        style: { fontFamily: 'Concert One', fontSize: 54, fill: 0xfff4e0 },
      }),
      animations: {
        hover: { props: { scale: { x: 1.05, y: 1.05 } }, duration: 100 },
        pressed: { props: { scale: { x: 0.95, y: 0.95 } }, duration: 100 },
      },
      anchor: 0.5,
    });

    this.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      onSubmit();
    });
  }
}
