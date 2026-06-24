import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Graphics, Text } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { LetterPopup } from './letter-popup';

function drawButton(size: number, state: 'default' | 'hover' | 'pressed') {
  const buttonColor = state === 'default' ? 0x5a8cd4 : state === 'hover' ? 0x22539a : 0x22539a;
  const shadowColor = state === 'default' ? 0x4673b8 : state === 'hover' ? 0xfff5da : 0x1b427a;
  const hoverShadowSize = size * 1.1;
  const hoverPadding = size * 0.05;

  return state === 'hover'
    ? new Graphics()
        .roundRect(0, 0, hoverShadowSize, hoverShadowSize, 30)
        .fill({ color: shadowColor })
        .roundRect(hoverPadding, hoverPadding, size, size, 25)
        .fill({ color: buttonColor })
    : new Graphics()
        .roundRect(0, 4, size, size, 25)
        .fill({ color: shadowColor })
        .roundRect(0, 0, size, size, 25)
        .fill({ color: buttonColor });
}

export class LetterKey extends FancyButton {
  public readonly letter: string;
  private readonly onBeforePress?: () => void;

  constructor(letter: string, size: number, onBeforePress?: () => void) {
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
    this.onBeforePress = onBeforePress;
    this.eventMode = 'static';
    this.onPress.connect(this.handlePress);
  }

  public bounce(): void {
    const baseY = this.position.y;
    const bounceDepths = [30, 20, 5];
    this.setState('hover');
    void animate(
      this.position,
      {
        y: [
          baseY,
          baseY - bounceDepths[0],
          baseY,
          baseY - bounceDepths[1],
          baseY,
          baseY - bounceDepths[2],
          baseY,
        ],
      },
      { duration: 1.4, ease: 'easeOut' },
    ).then(() => {
      this.setState('default');
    });
  }

  private readonly handlePress = () => {
    this.onBeforePress?.();
    void engine().navigation.showPopup(LetterPopup, this.letter);
  };
}
