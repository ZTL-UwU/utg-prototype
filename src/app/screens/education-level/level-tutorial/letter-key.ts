import { FancyButton } from '@pixi/ui';
import { Assets, Graphics, Text } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { LetterPopup } from './letter-popup';

function drawButton(size: number, state: 'default' | 'hover' | 'pressed') {
  const buttonColor = state === 'default' ? 0x5a8cd4 : state === 'hover' ? 0x71a0e3 : 0x22539a;
  const shadowColor = state === 'default' ? 0x4673b8 : state === 'hover' ? 0x4673b8 : 0x1b427a;

  return new Graphics()
    .roundRect(0, 4, size, size, 25)
    .fill({ color: shadowColor })
    .roundRect(0, 0, size, size, 25)
    .fill({ color: buttonColor });
}

export class LetterKey extends FancyButton {
  public readonly letter: string;

  constructor(letter: string, size: number) {
    super({
      defaultView: drawButton(size, 'default'),
      pressedView: drawButton(size, 'pressed'),
      hoverView: drawButton(size, 'hover'),
      animations: {
        hover: {
          props: { scale: { x: 1.03, y: 1.03 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.97, y: 0.97 } },
          duration: 100,
        },
      },
      text: new Text({
        text: letter,
        resolution: 2,
        style: {
          align: 'center',
          fill: 0xffffff,
          fontFamily: 'Noto Naskh Arabic Bold',
          fontSize: size * 0.4,
          fontWeight: '700',
          padding: 20,
        },
      }),
      anchor: 0.5,
    });

    this.letter = letter;
    this.eventMode = 'static';
    this.onPress.connect(this.handlePress);
  }

  private readonly handlePress = () => {
    if (Assets.resolver.hasKey(`${this.letter}.mp3`)) {
      engine().audio.sfx.play(`education-audio/letters/${this.letter}.mp3`);
    }
    void engine().navigation.showPopup(LetterPopup, this.letter);
  };
}
