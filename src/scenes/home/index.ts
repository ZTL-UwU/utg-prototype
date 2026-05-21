import { Container, Sprite, Text, Texture, type AssetsBundle } from 'pixi.js';

import type { SceneLifecycle } from '../types';
import { PlayButton } from './PlayButton';

export type HomeSceneData = {
  onPlay?: () => void;
};

export class HomeScene extends Container implements SceneLifecycle<HomeSceneData> {
  public static readonly sceneId = 'home';
  public static readonly assetBundles: AssetsBundle[] = [
    {
      name: 'home',
      assets: [
        { alias: 'home-bg', src: '/assets/home-bg.png' },
        {
          alias: 'league-spartan',
          src: 'https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;700;800&display=swap',
        },
      ],
    },
  ] as const;

  private readonly title = new Text({
    text: 'SOZLAR SAYAHATI',
    style: {
      align: 'center',
      fill: 0x3c6928,
      fontFamily: 'Concert One',
      fontSize: 200,
      fontWeight: '700',
      dropShadow: {
        color: 0x000000,
        blur: 4,
        angle: Math.PI / 6,
        distance: 6,
        alpha: 0.75,
      },
    },
  });
  //   this.title = new Text({
  //       text: 'TYPING JOURNEY',
  //       style: {
  //         fontFamily: 'Concert One',
  //         fontSize: 150,
  //         fontWeight: '800',
  //         fill: 0x6b3f1f,
  //       },
  //     });

  private readonly subtitle = new Text({
    text: "LET'S LEARN UYGHUR",
    style: {
      align: 'center',
      fill: 0xffffff,
      fontFamily: 'Concert One',
      fontSize: 95,
      dropShadow: {
        color: 0x000000,
        blur: 4,
        angle: Math.PI / 6,
        distance: 6,
        alpha: 0.75,
      },
    },
  });

  private readonly background = new Sprite();
  private playButton?: PlayButton;

  constructor() {
    super();
    this.addChild(this.background, this.title, this.subtitle);
  }

  public prepare(data?: HomeSceneData) {
    this.layout = {
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
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

    if (data?.onPlay) {
      this.playButton = new PlayButton(data.onPlay);
      this.addChild(this.playButton);
      this.playButton.layout = true;
    }

    this.alpha = 0;
  }

  public reset() {
    this.background.layout = null;
    this.title.layout = null;
    this.subtitle.layout = null;
    if (this.playButton) {
      this.playButton.layout = null;
    }
    this.playButton = undefined;
    this.layout = null;
  }

  public show() {
    this.alpha = 1;
  }

  public hide() {
    this.alpha = 0;
  }
}
