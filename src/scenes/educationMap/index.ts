import { Container, Text, type AssetsBundle } from 'pixi.js';

import { HomeButton } from '../components/HomeButton';
import type { SceneLifecycle } from '../types';
import { Background } from './background';
import { LevelRow } from './levelRow';

export type EducationMapSceneData = {
  onHome: () => void;
  onLevel: () => void;
};

export class EducationMapScene extends Container implements SceneLifecycle<EducationMapSceneData> {
  public static readonly sceneId = 'education-map';
  public static readonly assetBundles: AssetsBundle[] = [
    {
      name: 'education-map',
      assets: [
        {
          alias: 'education-map-background',
          src: '/assets/education-map/education-map-bg.png',
        },
        {
          alias: 'education-button-locked',
          src: '/assets/education-map/button-locked.png',
        },
      ],
    },
    {
      name: 'education-map-mini-map',
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

  public prepare(data: EducationMapSceneData) {
    this.background = new Background();
    this.homeButton = new HomeButton(data.onHome);

    this.title = new Text({
      text: 'LEARN ALPHABETS IN UYGHUR',
      style: {
        fontFamily: 'Concert One',
        fontSize: 100,
        fontWeight: '800',
        fill: 0x073fad,
        dropShadow: {
          color: 0x000000,
          blur: 4,
          angle: Math.PI / 6,
          distance: 6,
          alpha: 0.75,
        },
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
