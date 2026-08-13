import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { PASSPORT_TEXT_COLOR, PassportPage } from './page';

const LEVEL_COUNT = 6;
const LEVEL_LABELS = Array.from({ length: LEVEL_COUNT }, (_, i) => `Level ${i + 1}`);

const ENTER_OFFSET = 1000;
const EXIT_OFFSET = 300;

export class PassportPopup extends Container {
  public static assetBundles = ['passport'];
  private dismissOverlay: Sprite;
  private passportContainer: Container;
  private spread: Container;
  private nextButton: FancyButton;
  private titleText: Text;
  /** Resting y of the book, set by resize(). The slide animates to and from it. */
  private restingY = 0;

  constructor() {
    super();

    // Invisible full-screen catcher behind the book: a tap here means "outside the book".
    // Sized in resize(). Alpha does not affect hit testing, so it stays fully transparent.
    this.dismissOverlay = new Sprite({ texture: Texture.WHITE, alpha: 0 });
    this.dismissOverlay.eventMode = 'static';
    this.dismissOverlay.on('pointertap', () => {
      void engine().navigation.hidePopup();
    });

    this.passportContainer = new Container();
    const passportBackground: Sprite = new Sprite({
      texture: Texture.from('passport/book.png'),
      layout: {
        height: '100%',
        width: '100%',
      },
    });
    // Absorbs taps on the book so they never reach the overlay behind it.
    passportBackground.eventMode = 'static';
    this.nextButton = new FancyButton({
      defaultView: Texture.from('passport/next-arrow.png'),
      animations: {
        hover: {
          props: {
            scale: { x: 1.1, y: 1.1 },
          },
          duration: 100,
        },
      },
      anchor: 0.5,
    });
    this.nextButton.layout = {
      position: 'absolute',
      bottom: '10%',
      right: '5%',
    };
    this.titleText = new Text({
      text: 'EDUCATIONAL',
      style: {
        fill: PASSPORT_TEXT_COLOR,
        fontFamily: 'Concert One',
        fontSize: 60,
        fontWeight: '700',
      },
      layout: {
        position: 'absolute',
        top: '0%',
        left: '2.5%',
      },
    });

    this.spread = new Container({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        paddingTop: 90,
        paddingBottom: 40,
        paddingLeft: 40,
        paddingRight: 40,
        gap: 40,
      },
      children: [
        new PassportPage({ title: 'COMPLETION', labels: LEVEL_LABELS }),
        new PassportPage({ title: '3 STAR', labels: LEVEL_LABELS }),
      ],
    });

    this.passportContainer.addChild(
      passportBackground,
      this.spread,
      this.titleText,
      this.nextButton,
    );

    this.addChild(this.dismissOverlay, this.passportContainer);
  }

  public async show() {
    void engine().audio.sfx.play('preload-audio/sfx/popup.mp3');

    this.passportContainer.alpha = 0;
    this.passportContainer.y = this.restingY + ENTER_OFFSET;

    const duration = 0.4;
    await animate(
      this.passportContainer,
      { alpha: 1, y: this.restingY },
      { duration, ease: 'backOut' },
    );
  }

  public async hide() {
    const duration = 0.2;
    await animate(
      this.passportContainer,
      { alpha: 0, y: this.restingY + EXIT_OFFSET },
      { duration, ease: 'easeOut' },
    );
  }

  resize(width: number, height: number) {
    this.dismissOverlay.width = width;
    this.dismissOverlay.height = height;

    this.restingY = height * 0.1;
    this.passportContainer.layout = { width: width * 0.6, height: height * 0.8 };
    this.passportContainer.position.set(width * 0.2, this.restingY);
  }
}
