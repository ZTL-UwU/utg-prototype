import { Container, Text, type AssetsBundle } from 'pixi.js';

import { HomeButton } from '../components/HomeButton';
import type { SceneLifecycle } from '../types';
import { Background } from './background';
import { LevelRow } from './levelRow';

export type LevelMapSceneData = {
  onHome: () => void;
  onLevel: () => void;
};

export class LevelMapScene extends Container implements SceneLifecycle<LevelMapSceneData> {
  public static readonly sceneId = 'level-map';
  public static readonly assetBundles: AssetsBundle[] = [
    {
      name: 'level-map',
      assets: [
        {
          alias: 'level-map-background',
          src: '/assets/level-map/background.png',
        },
        {
          alias: 'level-button-locked',
          src: '/assets/level-map/button-locked.svg',
        },
      ],
    },
    {
      name: 'level-map-mini-map',
      assets: [
        {
          alias: 'level-map-mini-map',
          src: '/assets/level-map/mini-map.svg',
        },
      ],
    },
  ] as const;

  private background?: Background;
  private homeButton?: HomeButton;
  private levelRow?: LevelRow;
  private title?: Text;

  public prepare(data: LevelMapSceneData) {
    this.background = new Background();
    this.homeButton = new HomeButton(data.onHome);

    this.title = new Text({
      text: 'TYPING JOURNEY',
      style: {
        fontFamily: 'Concert One',
        fontSize: 150,
        fontWeight: '800',
        fill: 0x6b3f1f,
      },
    });
    this.title.anchor.set(0.5, 0);

    this.levelRow = new LevelRow(data.onLevel);
    this.addChild(this.background, this.homeButton, this.title, this.levelRow);
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
    this.background?.resize(width, height);
    this.title?.position.set(width / 2, 150);
  }
}
