import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import type { AppScreenConstructor } from '../../../engine/navigation/navigation';

type TutorialProps = {
  type: 'education' | 'typing';
  exitable?: boolean;
  nextScreen?: AppScreenConstructor;
};

export class TutorialPopup extends Container {
  public static assetBundles = ['tutorial-popups'];
  private background: Sprite;
  private exitButton: FancyButton;
  private nextScreen?: AppScreenConstructor;
  private autoAdvanceTimeout?: ReturnType<typeof setTimeout>;
  private backdrop: Graphics;
  private backdropColor: number;
  private exitable: boolean;
  constructor({ type, exitable = false, nextScreen }: TutorialProps) {
    super({ layout: { position: 'absolute', width: '100%', height: '100%' } });
    this.nextScreen = nextScreen;
    this.backdropColor = type === 'typing' ? 0x7d5600 : 0x4a90e2;
    this.exitable = exitable;
    this.backdrop = new Graphics();
    this.backdrop.layout = {
      position: 'absolute',
      width: '90%',
      height: '90%',
      top: '5%',
      left: '5%',
    };

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
      top: 30,
      left: 30,
      width: 80,
      height: 80,
    };
    this.exitButton.onPress.connect(() => void engine().navigation.hidePopup());

    if (exitable) {
      this.addChild(this.backdrop); // behind the SVG
    }
    this.addChild(this.background);
    if (exitable) {
      this.addChild(this.exitButton);
    }
  }

  resize(width: number, height: number) {
    this.layout = { width, height };

    if (this.exitable) {
      const w = width * 0.9;
      const h = height * 0.9;
      const radius = Math.min(w, h) * 0.05;
      this.backdrop.clear().roundRect(0, 0, w, h, radius).fill(this.backdropColor);
    }
  }

  async show() {
    this.background.alpha = 0;
    this.background.scale.set(0.5, 0.5);
    if (this.exitable) {
      this.backdrop.alpha = 0;
      this.backdrop.scale.set(0.5, 0.5);
    }

    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.tint = 0x666666;
    }

    if (this.nextScreen) {
      this.autoAdvanceTimeout = setTimeout(() => {
        void engine()
          .navigation.hidePopup()
          .then(() => {
            void engine().navigation.showScreen(this.nextScreen!);
          });
      }, 5000);
    }

    await Promise.all([
      animate(this.background, { alpha: 1 }, { duration: 0.8, ease: 'backOut' }),
      animate(this.background.scale, { x: 1, y: 1 }, { duration: 0.8, ease: 'backOut' }),
      ...(this.exitable
        ? [
            animate(this.backdrop, { alpha: 1 }, { duration: 0.8, ease: 'backOut' }),
            animate(this.backdrop.scale, { x: 1, y: 1 }, { duration: 0.8, ease: 'backOut' }),
          ]
        : []),
    ]);
  }

  async hide() {
    if (this.autoAdvanceTimeout !== undefined) {
      clearTimeout(this.autoAdvanceTimeout);
      this.autoAdvanceTimeout = undefined;
    }

    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.tint = 0xffffff;
    }

    await Promise.all([
      animate(this.background.scale, { x: 0.1, y: 0.1 }, { duration: 0.6, ease: 'backIn' }),
      animate(this.background, { alpha: 0 }, { duration: 0.5, ease: 'easeOut' }),
      animate(this.exitButton.scale, { x: 0.1, y: 0.1 }, { duration: 0.6, ease: 'backIn' }),
      ...(this.exitable
        ? [
            animate(this.backdrop.scale, { x: 0.1, y: 0.1 }, { duration: 0.6, ease: 'backIn' }),
            animate(this.backdrop, { alpha: 0 }, { duration: 0.5, ease: 'easeOut' }),
          ]
        : []),
    ]);
  }
}
