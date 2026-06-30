import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { RoundedProgressBar } from '../../ui/rounded-progress-bar';

type TutorialProps = {
  asset: string;
  backdropColor: number;
  isFullscreen?: boolean;
  onNext?: () => void;
};

const AUTO_ADVANCE_MS = 3000;

export class TutorialPopup extends Container {
  public static assetBundles = ['tutorial-popups'];
  private background: Sprite;
  private exitButton: FancyButton;
  private onNext?: () => void;

  private autoAdvanceElapsedMs = 0;
  private progressBar?: RoundedProgressBar;

  private backdrop: Graphics;
  private backdropColor: number;
  private isFullscreen: boolean;

  constructor({ asset, backdropColor, isFullscreen = true, onNext }: TutorialProps) {
    super({ layout: { position: 'absolute', width: '100%', height: '100%' } });
    this.onNext = onNext;
    this.backdropColor = backdropColor;
    this.isFullscreen = isFullscreen;
    this.backdrop = new Graphics();
    this.backdrop.layout = {
      position: 'absolute',
      width: '90%',
      height: '90%',
      top: '5%',
      left: '5%',
    };

    this.background = new Sprite({
      texture: Texture.from(asset),
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
      if (!isFullscreen) {
        void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        void engine().navigation.hidePopup();
      } else {
        void engine()
          .navigation.hidePopup()
          .then(() => {
            this.onNext?.();
          });
      }
    });

    if (!isFullscreen) {
      this.addChild(this.backdrop); // behind the SVG
    }
    this.addChild(this.background, this.exitButton);

    if (onNext) {
      this.progressBar = new RoundedProgressBar();
      this.addChild(this.progressBar);
      this.layoutProgressBar(engine().screen.width, engine().screen.height);
    }
  }

  private layoutProgressBar(screenWidth: number, screenHeight: number) {
    if (!this.progressBar) return;

    const bottomOffset = 32;
    this.progressBar.x = (screenWidth - this.progressBar.width) / 2;
    this.progressBar.y = screenHeight - this.progressBar.height - bottomOffset;
  }

  resize(width: number, height: number) {
    this.layout = { width, height };

    this.layoutProgressBar(width, height);

    if (!this.isFullscreen) {
      const w = width * 0.9;
      const h = height * 0.9;
      const radius = Math.min(w, h) * 0.05;
      this.backdrop.clear().roundRect(0, 0, w, h, radius).fill(this.backdropColor);
    }
  }

  async show() {
    this.background.alpha = 0;
    this.background.scale.set(0.5, 0.5);
    if (!this.isFullscreen) {
      this.backdrop.alpha = 0;
      this.backdrop.scale.set(0.5, 0.5);
      void engine().audio.sfx.play('preload-audio/sfx/popup.mp3');
    }

    if (this.progressBar) {
      this.progressBar.alpha = 0;
      this.progressBar.progress = 0;
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
      ...(!this.isFullscreen
        ? [
            animate(this.backdrop, { alpha: 1 }, { duration: 0.8, ease: 'backOut' }),
            animate(this.backdrop.scale, { x: 1, y: 1 }, { duration: 0.8, ease: 'backOut' }),
          ]
        : []),
    ]);
  }

  update(ticker: Ticker) {
    if (!this.onNext) return;

    const currentEngine = engine();
    this.autoAdvanceElapsedMs += ticker.deltaMS;

    if (this.progressBar) {
      this.progressBar.progress = Math.min(this.autoAdvanceElapsedMs / AUTO_ADVANCE_MS, 1);
    }

    if (this.autoAdvanceElapsedMs >= AUTO_ADVANCE_MS) {
      void currentEngine.navigation.hidePopup().then(() => {
        this.onNext?.();
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
      ...(!this.isFullscreen
        ? [
            animate(this.backdrop.scale, { x: 0.1, y: 0.1 }, { duration: 0.6, ease: 'backIn' }),
            animate(this.backdrop, { alpha: 0 }, { duration: 0.5, ease: 'easeOut' }),
          ]
        : []),
    ]);
  }
}
