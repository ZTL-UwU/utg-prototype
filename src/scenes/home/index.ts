import { Container, Sprite, Text, Texture, type AssetsBundle } from 'pixi.js';

import type { SceneLifecycle } from '../types';

export class HomeScene extends Container implements SceneLifecycle {
  public static readonly sceneId = 'home';
  public static readonly assetBundles: AssetsBundle[] = [
    {
      name: 'home',
      assets: [{ alias: 'home-bg', src: '/home-bg.png' }],
    },
  ] as const;

  private readonly title = new Text({
    text: 'Home Page',
    style: {
      align: 'center',
      fill: 0x000000,
      fontFamily: 'Arial',
      fontSize: 48,
      fontWeight: '700',
    },
  });

  private readonly subtitle = new Text({
    text: 'Placeholder',
    style: {
      align: 'center',
      fill: 0xa7f3d0,
      fontFamily: 'Arial',
      fontSize: 22,
    },
  });

  private readonly background = new Sprite();

  constructor() {
    super();
    this.addChild(this.background, this.title, this.subtitle);
  }

  public prepare() {
    this.layout = {
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    };
    this.background.layout = {
      position: 'absolute',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    };
    this.title.layout = true;
    this.subtitle.layout = true;
    this.background.texture = Texture.from('home-bg');
    this.alpha = 0;
  }

  public reset() {
    this.layout = null;
    this.background.layout = null;
    this.title.layout = null;
    this.subtitle.layout = null;
  }

  public show() {
    this.alpha = 1;
  }

  public hide() {
    this.alpha = 0;
  }
}
