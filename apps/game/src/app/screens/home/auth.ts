import { Container, Sprite, Texture } from 'pixi.js';

import { useOverlayStore } from '../../../zustandStores/overlayStore';

/**
 * Holds the home background while the React auth card is up. Dismissing the card
 * navigates to {@link HomeScreen}, which is what tears this screen down.
 */
export class AuthScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ['home'];

  private background: Sprite;

  constructor() {
    super();

    this.background = new Sprite({
      texture: Texture.from('home/background.png'),
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      },
    });

    this.addChild(this.background);
  }

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.layout = { width, height };
  }

  /** Show screen */
  public async show() {
    useOverlayStore.getState().show('auth');
  }

  /** Hide screen */
  public async hide() {
    useOverlayStore.getState().hide();
  }
}
