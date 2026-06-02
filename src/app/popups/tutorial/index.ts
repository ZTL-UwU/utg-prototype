import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';

type TutorialProps = {
  type: 'education' | 'typing';
  exitable?: boolean;
};
export class TutorialPopup extends Container {
  public static assetBundles = ['tutorial-popups'];
  private background: Sprite;
  private exitButton: FancyButton;
  constructor({ type, exitable = false }: TutorialProps) {
    super({ layout: { position: 'absolute', width: '100%', height: '100%' } });
    this.background = new Sprite({
      texture: Texture.from(
        type == 'typing'
          ? 'tutorial-popups/typing-tutorial.svg'
          : 'tutorial-popups/education-tutorial.svg',
      ),
      layout: {
        position: 'absolute',
        width: '90%',
        height: '90%',
        top: '5%',
        left: '5%',
        objectFit: 'contain',
      },
      anchor: 0.5,
    });

    this.exitButton = new FancyButton({ defaultView: 'tutorial-popups/exit-button.svg' });
    this.exitButton.layout = {
      isLeaf: true,
      position: 'absolute',
      top: 40,
      left: 40,
      width: 100, // match your SVG's natural size, or whatever looks right
      height: 100,
    };
    this.exitButton.onPress.connect(() => void engine().navigation.hidePopup());
    this.addChild(this.background);
    if (exitable) {
      this.addChild(this.exitButton);
    }
  }
  resize(width: number, height: number) {
    this.layout = { width, height };
  }
  async show() {
    this.background.alpha = 0;
    this.background.scale.set(0.5, 0.5);
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.tint = 0x666666;
    }

    await Promise.all([
      animate(this.background, { alpha: 1 }, { duration: 0.8, ease: 'easeIn' }),
      animate(this.background.scale, { x: 1, y: 1 }, { duration: 0.8, ease: 'easeIn' }),
    ]);
  }
  async hide() {
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.tint = 0xffffff;
    }
    await Promise.all([
      animate(this.background.scale, { x: 0.1, y: 0.1 }, { duration: 0.4, ease: 'easeOut' }),
      animate(this.background, { alpha: 0 }, { duration: 0.8, ease: 'easeOut' }),
      animate(this.exitButton.scale, { x: 0.1, y: 0.1 }, { duration: 0.8, ease: 'easeOut' }),
    ]);
  }
}
