import { Dialog, FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { BlurFilter, Container, Graphics, Text } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { useScoreManager } from '../../../zustandStores/scoreManager';
import { AccuracyDisplay } from './accuracy-display';

function formatScoreContent(correctCount: number, mistakeCount: number) {
  return `Correct: ${correctCount}\nMistakes: ${mistakeCount}`;
}

const POPUP_MASK_OPACITY = 0.7;

export class HelpPopup extends Container {
  private popupMask: Graphics;
  private dialog: Dialog;
  private scoreContent: Text;
  private accuracyDisplay: AccuracyDisplay;
  private unsubscribeScore: () => void;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      },
    });

    this.popupMask = new Graphics();
    this.popupMask.interactive = true;
    this.popupMask.layout = {
      width: '100%',
      height: '100%',
      position: 'absolute',
    };

    this.scoreContent = new Text({
      text: formatScoreContent(0, 0),
      resolution: 2,
      style: {
        fontFamily: 'Concert One',
        fontSize: 28,
        fill: 0x000000,
      },
    });

    this.accuracyDisplay = new AccuracyDisplay();

    this.updateScoreContent();
    this.unsubscribeScore = useScoreManager.subscribe(() => {
      this.updateScoreContent();
    });

    const dialogHeight = 350;
    const dialogWidth = 420;
    this.dialog = new Dialog({
      width: dialogWidth,
      height: dialogHeight,
      background: new Graphics().roundRect(0, 0, dialogWidth, dialogHeight, 20).fill(0xf2c583),
      title: new Text({
        text: 'Help',
        style: {
          fontFamily: 'Concert One',
          fontSize: 48,
          fontWeight: 'bold',
          fill: 0x000000,
        },
      }),
      content: [this.scoreContent, ...this.accuracyDisplay.content],
      scrollBox: {
        type: 'vertical',
        elementsMargin: 12,
      },
      buttons: [
        new FancyButton({
          defaultView: new Graphics().roundRect(0, 0, 100, 40, 10).fill(0xffffff),
          text: 'OK',
        }),
      ],
      animations: {
        open: {
          props: {},
          duration: 300,
        },
        close: {
          props: {},
          duration: 300,
        },
      },
    });
    this.dialog.layout = true;

    this.addChild(this.popupMask, this.dialog);

    this.dialog.onSelect.connect(() => {
      void engine().navigation.hidePopup();
    });
  }

  private updateScoreContent() {
    const { correctCount, mistakeCount } = useScoreManager.getState();

    this.scoreContent.text = formatScoreContent(correctCount, mistakeCount);
    this.accuracyDisplay.update(correctCount, mistakeCount);
  }

  /** Present the popup, animated */
  public async show() {
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 5 })];
    }

    this.popupMask.alpha = 0;
    animate(this.popupMask, { alpha: POPUP_MASK_OPACITY }, { duration: 0.2, ease: 'linear' });
    this.dialog.open();
  }

  /** Dismiss the popup, animated */
  public async hide() {
    this.unsubscribeScore();

    const currentEngine = engine();
    await Promise.all([
      animate(this.popupMask, { alpha: 0 }, { duration: 0.2, ease: 'linear' }),
      new Promise<void>((resolve) => {
        const connection = this.dialog.onClose.connect(() => {
          connection.disconnect();
          resolve();
        });
        this.dialog.close();
      }),
    ]);

    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [];
    }
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
    this.popupMask.clear().rect(0, 0, width, height).fill(0x000000);
  }
}
