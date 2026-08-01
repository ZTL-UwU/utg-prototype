import { FancyButton } from '@pixi/ui';
import { Text, Texture } from 'pixi.js';

import { convertToCurrentScript, getScriptFontFamily } from '../../../../utils/script';

const WRONG_TILE_TINT = 0x888888;

export class LetterTile extends FancyButton {
  private wrong = false;

  constructor({ letter, onClick }: { letter?: string; onClick?: () => void }) {
    super({
      defaultView: Texture.from(`education-levels/education-level-6/tile.png`),
      text: new Text({
        text: letter ? convertToCurrentScript(letter) : '',
        style: {
          fontFamily: getScriptFontFamily(),
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

  public get isWrong() {
    return this.wrong;
  }

  public markWrong() {
    this.wrong = true;
    this.enabled = false;
    this.tint = WRONG_TILE_TINT;
  }
}
