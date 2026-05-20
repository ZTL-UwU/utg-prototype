import { Container, type AssetsBundle } from 'pixi.js';

import type { SceneLifecycle } from '../types';
import { Background } from './Background';
import { HelpButton } from './HelpButton';
import { HomeButton } from './HomeButton';
import { LetterRow } from './LetterRow';
import { Title } from './Title';

export type LevelSceneData = {
  onHome?: () => void;
};

export class LevelScene extends Container implements SceneLifecycle<LevelSceneData> {
  public static readonly sceneId = 'level';
  public static readonly assetBundles: AssetsBundle[] = [
    {
      name: 'level',
      assets: [{ alias: 'background', src: '/assets/level/background.png' }],
    },
  ] as const;

  private background?: Background;
  private letterRow?: LetterRow;
  private homeButton?: HomeButton;
  private helpButton?: HelpButton;
  private title?: Title;

  public prepare(data?: LevelSceneData) {
    this.layout = {
      width: '100%',
      height: '100%',
    };

    this.background = new Background();
    this.letterRow = new LetterRow({
      onComplete: data?.onHome,
    });
    this.title = new Title('Taklamakan Desert');
    this.helpButton = new HelpButton();

    if (data?.onHome) {
      this.homeButton = new HomeButton(data.onHome);
    }

    const hud = [this.homeButton, this.helpButton, this.title].filter(
      (child) => child !== undefined,
    );
    this.addChild(this.background, this.letterRow, ...hud);
    this.alpha = 0;
  }

  public reset() {
    this.background = undefined;
    this.letterRow = undefined;
    this.homeButton = undefined;
    this.helpButton = undefined;
    this.title = undefined;
    this.layout = null;
  }

  public show() {
    this.alpha = 1;
  }

  public hide() {
    this.alpha = 0;
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
    this.background?.resize(width, height);
    this.letterRow?.resize(width, height);
    this.title?.resize(width);
  }

  public pause() {
    this.letterRow?.pause();
  }

  public resume() {
    this.letterRow?.resume();
  }
}
