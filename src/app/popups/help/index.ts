import { Dialog, FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { BlurFilter, Container, Graphics, Texture, Sprite, Text } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { useScoreManager } from '../../../zustandStores/scoreManager';

function formatScoreContent(correctCount: number, mistakeCount: number) {
  return `Typing score (demo)\nCorrect: ${correctCount}\nMistakes: ${mistakeCount}`;
}

export class HelpPopup extends Container {
  private popupMask: Sprite;
  private dialog: Dialog;
  private scoreContent: Text;
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

    this.popupMask = new Sprite({
      texture: Texture.WHITE,
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
      },
      tint: 0x0,
      interactive: true,
    });

    this.scoreContent = new Text({
      text: formatScoreContent(0, 0),
      resolution: 2,
      style: {
        fontFamily: 'Concert One',
        fontSize: 28,
        fill: 0x000000,
      },
    });

    this.updateScoreContent();
    this.unsubscribeScore = useScoreManager.subscribe(() => {
      this.updateScoreContent();
    });

    this.dialog = new Dialog({
      width: 420,
      height: 260,
      background: new Graphics().roundRect(0, 0, 420, 300, 20).fill(0xf2c583),
      title: new Text({
        text: 'Help',
        style: {
          fontFamily: 'Concert One',
          fontSize: 48,
          fontWeight: 'bold',
          fill: 0x000000,
        },
      }),
      content: [this.scoreContent],
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
  }

  /** Present the popup, animated */
  public async show() {
    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 5 })];
    }

    this.popupMask.alpha = 0;
    animate(this.popupMask, { alpha: 0.5 }, { duration: 0.2, ease: 'linear' });
    this.dialog.open();
  }

  /** Dismiss the popup, animated */
  public async hide() {
    this.unsubscribeScore();

    const currentEngine = engine();
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [];
    }
    animate(this.popupMask, { alpha: 0 }, { duration: 0.2, ease: 'linear' });
    this.dialog.close();
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }
}
