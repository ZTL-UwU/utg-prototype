import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { AlphabetGrid } from '../../../ui/alphabet-grid';
import { HUD } from '../../../ui/hud';
import { LevelMapScreen } from '../../level-map';
import type { TMapUnit } from '../../level-map/units';
import { LetterPopup } from './letter-popup';

type TutorialPresentation = 'popup' | 'screen';

export class TypingTutorialScreen extends Container {
  public static assetBundles = ['typing-level', 'ui'];

  private background?: Sprite;
  private hud: HUD;
  private letterGrid: AlphabetGrid;

  constructor(mapUnit: TMapUnit, presentation: TutorialPresentation = 'screen') {
    super();

    this.hud = new HUD({
      onBack: () =>
        void (presentation === 'popup'
          ? engine().navigation.hidePopup()
          : engine().navigation.showScreen(LevelMapScreen, mapUnit)),
    });

    this.letterGrid = new AlphabetGrid(
      (letter) => {
        void (presentation === 'popup'
          ? engine().navigation.showNestedPopup(LetterPopup, letter)
          : engine().navigation.showPopup(LetterPopup, letter));
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

    if (presentation === 'popup') {
      const currentScreen = engine().navigation.currentScreen;
      if (currentScreen) currentScreen.tint = 0x666666;
    }

    if (presentation === 'screen') {
      this.background = new Sprite({
        texture: Texture.from('typing-levels/typing-level/background-taklamakan.png'),
        layout: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      });
    }

    this.addChild(...(this.background ? [this.background] : []), this.letterGrid, this.hud);
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
    const currentScreen = engine().navigation.currentScreen;
    if (currentScreen) currentScreen.tint = 0xffffff;
    await Promise.all([
      animate(this.letterGrid, { alpha: 0 }, { duration: 0.2, ease: 'easeIn' }),
      animate(this.letterGrid.scale, { x: 0.4, y: 0.4 }, { duration: 0.2, ease: 'easeIn' }),
    ]);
  }
}

export class TypingTutorialPopup extends TypingTutorialScreen {
  constructor(mapUnit: TMapUnit) {
    super(mapUnit, 'popup');
  }
}
