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

  private autoAdvanceElapsedMs = 0;
  private progressBar?: Container;
  private progressBarTrack?: Graphics;
  private progressBarFill?: Graphics;
  private progressBarWidth = 0;
  private progressBarHeight = 0;
  private progress = 0;

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
        width: '84%',
        height: '84%',
        top: '8%',
        left: '8%',
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
    this.exitButton.onPress.connect(() => {
      engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.hidePopup();
    });

    if (exitable) {
      this.addChild(this.backdrop); // behind the SVG
    }
    this.addChild(this.background);
    if (exitable) {
      this.addChild(this.exitButton);
    }

    if (nextScreen) {
      this.progressBar = new Container();
      this.progressBarTrack = new Graphics();
      this.progressBarFill = new Graphics();
      this.progressBar.addChild(this.progressBarTrack, this.progressBarFill);
      this.addChild(this.progressBar);
      this.layoutProgressBar();
    }
  }

  private layoutProgressBar() {
    if (!this.progressBar || !this.progressBarTrack || !this.progressBarFill) return;

    const { width, height } = engine().screen;
    const barWidth = 400;
    const barHeight = 35;
    this.progressBarWidth = barWidth;
    this.progressBarHeight = barHeight;

    this.progressBar.x = (width - barWidth) / 2;
    this.progressBar.y = height - barHeight - 32;

    this.progressBarTrack
      .clear()
      .roundRect(0, 0, barWidth, barHeight, barHeight / 2)
      .stroke({ width: 3, color: 0xfbf0de, alignment: 0.5 });

    this.redrawProgressBarFill();
  }

  private redrawProgressBarFill() {
    if (!this.progressBarFill) return;

    const padding = 4;
    const innerWidth = this.progressBarWidth - padding * 2;
    const innerHeight = this.progressBarHeight - padding * 2;
    const filledWidth = Math.max(0, Math.min(innerWidth, innerWidth * this.progress));

    this.progressBarFill.clear();
    if (filledWidth > 0) {
      this.progressBarFill
        .roundRect(padding, padding, filledWidth, innerHeight, innerHeight / 2)
        .fill(0xfbf0de);
    }
  }

  resize(width: number, height: number) {
    this.layout = { width, height };

    this.layoutProgressBar();

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
      engine().audio.sfx.play('preload-audio/sfx/popup.mp3');
    }

    if (this.progressBar) {
      this.progressBar.alpha = 0;
      this.progress = 0;
      this.redrawProgressBarFill();
    }

    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.tint = 0x666666;
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

  update(ticker: Ticker) {
    if (!this.nextScreen) return;

    const currentEngine = engine();
    this.autoAdvanceElapsedMs += ticker.deltaMS;

    this.progress = Math.min(this.autoAdvanceElapsedMs / AUTO_ADVANCE_MS, 1);
    this.redrawProgressBarFill();

    if (this.autoAdvanceElapsedMs >= AUTO_ADVANCE_MS) {
      void currentEngine.navigation.hidePopup().then(() => {
        void currentEngine.navigation.showScreen(this.nextScreen!);
      });
    }
  }

  async hide() {
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
