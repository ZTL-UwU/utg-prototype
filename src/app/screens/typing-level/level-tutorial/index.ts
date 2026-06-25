import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { AlphabetGrid } from '../../../ui/alphabet-grid';
import { HUD } from '../../../ui/hud';
import { LevelMapScreen } from '../../level-map';
import type { TMapUnit } from '../../level-map/units';
import { LetterPopup } from './letter-popup';

export class TypingTutorialScreen extends Container {
  public static assetBundles = ['typing-level', 'ui'];

  private background: Sprite;
  private hud: HUD;
  private letterGrid: AlphabetGrid;

  constructor(mapUnit: TMapUnit) {
    super();

    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level/background-taklamakan.png'),
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      },
    });

    this.hud = new HUD({
      onBack: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
      noHelpButton: true,
    });

    this.letterGrid = new AlphabetGrid(
      (letter) => {
        void engine().navigation.showPopup(LetterPopup, letter);
      },
      {
        panelColor: 0xf3ca8a,
        panelShadowColor: 0xc98144,
        keyColor: 0xc98144,
        keyPressedColor: 0x8d6241,
        keyShadowColor: 0x8d6241,
        keyHoverShadowColor: 0xfff5da,
        keyPressedShadowColor: 0x66432c,
        textColor: 0xffffff,
      },
    );

    this.addChild(this.background, this.letterGrid, this.hud);
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.letterGrid.resize(width, height);
  }

  public async show() {
    this.letterGrid.alpha = 0;
    this.letterGrid.scale.set(0.4);
    await Promise.all([
      animate(this.letterGrid, { alpha: 1 }, { duration: 0.4, ease: 'backOut' }),
      animate(this.letterGrid.scale, { x: 1, y: 1 }, { duration: 0.4, ease: 'backOut' }),
    ]);
  }

  public async hide() {
    await Promise.all([
      animate(this.letterGrid, { alpha: 0 }, { duration: 0.2, ease: 'easeIn' }),
      animate(this.letterGrid.scale, { x: 0.4, y: 0.4 }, { duration: 0.2, ease: 'easeIn' }),
    ]);
  }
}
