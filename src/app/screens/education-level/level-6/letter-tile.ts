import { FancyButton } from '@pixi/ui';
import { Text, Texture } from 'pixi.js';

export class LetterTile extends FancyButton {
  constructor({ letter, onClick }: { letter?: string; onClick?: () => void }) {
    super({
      defaultView: Texture.from(`education-level-6/tile.png`),
      text: new Text({
        text: letter ?? '',
        style: {
          fontFamily: 'Noto Naskh Arabic Bold',
          fontWeight: '700',
          fontSize: 100,
          padding: 30,
          fill: 0x51351e,
        },
      }),
      animations: {
        hover: {
          props: { scale: { x: 1.05, y: 1.05 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.97, y: 0.97 } },
          duration: 100,
        },
      },
      anchor: 0.5,
    });

    if (onClick) {
      this.onPress.connect(onClick);
    }
  }
}
