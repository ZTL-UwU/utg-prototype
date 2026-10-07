import { Container, Sprite, Texture } from 'pixi.js';

import type { PasswordResetParams } from '../../../lib/passwordReset';
import { useOverlayStore } from '../../../zustandStores/overlayStore';

export type AuthScreenProps = {
  /** Opened from a reset-password link: show the reset form for these credentials. */
  passwordReset?: PasswordResetParams;
  /** In-app href to continue to once logged in, instead of the layer select. */
  returnTo?: string;
};

/**
 * Holds the home background while the React auth card is up. Dismissing the card
 * navigates to {@link HomeScreen}, which is what tears this screen down.
 */
export class AuthScreen extends Container {
  public readonly screenName = 'AuthScreen';
  /** Assets bundles required by this screen */
  public static assetBundles = ['home'];

  private background: Sprite;
  private props: AuthScreenProps;

  constructor(props: AuthScreenProps = {}) {
    super();
    this.props = props;

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
    useOverlayStore.getState().show('auth', this.props);
  }

  /** Hide screen */
  public async hide() {
    useOverlayStore.getState().hide();
  }
}
