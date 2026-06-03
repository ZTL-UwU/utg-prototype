import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import type { AppScreenConstructor } from '../../../engine/navigation/navigation';

type TutorialProps = {
  type: 'education' | 'typing';
  exitable?: boolean;
  nextScreen?: AppScreenConstructor;
};

const AUTO_ADVANCE_MS = 3000;

export class TutorialPopup extends Container {
  public static assetBundles = ['tutorial-popups'];
  private background: Sprite;
  private exitButton: FancyButton;
  private nextScreen?: AppScreenConstructor;
  private autoAdvanceTick?: (ticker: Ticker) => void;
  private autoAdvanceElapsedMs = 0;
  private progressBar?: Graphics;
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

    if (nextScreen) {
      const progressBarHeight = 20;
      this.progressBar = new Graphics().rect(0, 0, 1, progressBarHeight).fill(0xf3ca8a);
      this.progressBar.y = engine().screen.height - progressBarHeight;
      this.addChild(this.progressBar);
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
    if (this.progressBar) {
      this.progressBar.alpha = 0;
      this.progressBar.width = 0;
    }

    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.tint = 0x666666;
    }

    if (this.nextScreen) {
      this.autoAdvanceElapsedMs = 0;
      this.autoAdvanceTick = (ticker: Ticker) => {
        this.autoAdvanceElapsedMs += ticker.deltaMS;

        if (this.progressBar) {
          this.progressBar.width = Math.min(
            (this.autoAdvanceElapsedMs / AUTO_ADVANCE_MS) * engine().screen.width,
            engine().screen.width,
          );
        }

        if (this.autoAdvanceElapsedMs < AUTO_ADVANCE_MS) return;

        this.clearAutoAdvanceTick();
        void engine()
          .navigation.hidePopup()
          .then(() => {
            void engine().navigation.showScreen(this.nextScreen!);
          });
      };

      engine().ticker.add(this.autoAdvanceTick);
    }

    await Promise.all([
      animate(this.background, { alpha: 1 }, { duration: 0.8, ease: 'backOut' }),
      animate(this.background.scale, { x: 1, y: 1 }, { duration: 0.8, ease: 'backOut' }),
      ...(this.progressBar
        ? [animate(this.progressBar, { alpha: 1 }, { duration: 0.8, ease: 'backOut' })]
        : []),
      ...(this.exitable
        ? [
            animate(this.backdrop, { alpha: 1 }, { duration: 0.8, ease: 'backOut' }),
            animate(this.backdrop.scale, { x: 1, y: 1 }, { duration: 0.8, ease: 'backOut' }),
          ]
        : []),
    ]);
  }

  private clearAutoAdvanceTick() {
    if (this.autoAdvanceTick) {
      engine().ticker.remove(this.autoAdvanceTick);
      this.autoAdvanceTick = undefined;
    }
    this.autoAdvanceElapsedMs = 0;
  }

  async hide() {
    this.clearAutoAdvanceTick();

    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.tint = 0xffffff;
    }

    await Promise.all([
      animate(this.background.scale, { x: 0.1, y: 0.1 }, { duration: 0.6, ease: 'backIn' }),
      animate(this.background, { alpha: 0 }, { duration: 0.5, ease: 'easeOut' }),
      animate(this.exitButton.scale, { x: 0.1, y: 0.1 }, { duration: 0.6, ease: 'backIn' }),
      ...(this.progressBar
        ? [animate(this.progressBar, { alpha: 0 }, { duration: 0.5, ease: 'easeOut' })]
        : []),
      ...(this.exitable
        ? [
            animate(this.backdrop.scale, { x: 0.1, y: 0.1 }, { duration: 0.6, ease: 'backIn' }),
            animate(this.backdrop, { alpha: 0 }, { duration: 0.5, ease: 'easeOut' }),
          ]
        : []),
    ]);
  }
}
