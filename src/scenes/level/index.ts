import { Container, type AssetsBundle } from 'pixi.js';

import type { SceneLifecycle } from '../types';
import { Background } from './Background';
import { Camel } from './Camel';
import { HomeButton } from './HomeButton';
import { LetterRow } from './LetterRow';
import { Score } from './Score';
import { Title } from './Title';

const CAMEL_FRAME_COUNT = 25;

export type LevelSceneData = {
  onHome?: () => void;
};

export class LevelScene extends Container implements SceneLifecycle<LevelSceneData> {
  public static readonly sceneId = 'level';
  public static readonly assetBundles: AssetsBundle[] = [
    {
      name: 'level',
      assets: [
        { alias: 'background', src: '/assets/level/background.png' },
        ...Array.from({ length: CAMEL_FRAME_COUNT }, (_, i) => ({
          alias: `camel_frame_${i}`,
          src: `/assets/level/camel-frames/frame_${String(i).padStart(3, '0')}.png`,
        })),
      ],
    },
  ] as const;

  private background?: Background;
  private camel?: Camel;
  private letterRow?: LetterRow;
  private homeButton?: HomeButton;
  private score?: Score;
  private title?: Title;

  private currentScore = 0;

  public prepare(data?: LevelSceneData) {
    this.currentScore = 0;

    this.background = new Background();
    this.camel = new Camel();
    this.score = new Score();
    this.letterRow = new LetterRow({
      onCorrect: () => {
        this.currentScore += 1;
        this.score?.setScore(this.currentScore);
      },
    });

    this.title = new Title('Taklamakan Desert');

    if (data?.onHome) {
      this.homeButton = new HomeButton(data.onHome);
    }

    const hud = [this.score, this.homeButton, this.title].filter((child) => child !== undefined);
    this.addChild(this.background, this.camel, this.letterRow, ...hud);
    this.alpha = 0;
  }

  public reset() {
    this.currentScore = 0;
    this.background = undefined;
    this.camel = undefined;
    this.letterRow = undefined;
    this.homeButton = undefined;
    this.score = undefined;
    this.title = undefined;
  }

  public show() {
    this.alpha = 1;
  }

  public hide() {
    this.alpha = 0;
  }

  public resize(width: number, height: number) {
    this.background?.resize(width, height);
    this.camel?.resize(width, height);
    this.letterRow?.resize(width, height);
    this.score?.resize(width);
    this.homeButton?.resize();
    this.title?.resize(width);
  }

  public pause() {
    this.letterRow?.pause();
  }

  public resume() {
    this.letterRow?.resume();
  }
}
