import { Container, type AssetsBundle } from 'pixi.js';

import { HomeButton } from '../components/HomeButton';
import type { SceneLifecycle } from '../types';
import { Background } from './background';
import { HelpButton } from './HelpButton';
import { LetterGrid } from './letterGrid';
import { MainCard } from './MainCard';
import { SoundButton } from './SoundButton';

export type EducationLevelSceneData = {
  onBack: () => void;
};

export class EducationLevelScene extends Container implements SceneLifecycle<EducationLevelSceneData> {
  public static readonly sceneId = 'educationLevel';
  public static readonly assetBundles: AssetsBundle[] = [
    {
      name: 'educationLevel',
      assets: [{ alias: 'education-level-bg', src: '/assets/education-level/education-level-bg.svg' }],
    },
  ];

  private background?: Background;
  private mainCard?: MainCard;
  private letterGrid?: LetterGrid;
  private soundButton?: SoundButton;
  private homeButton?: HomeButton;
  private helpButton?: HelpButton;
  private screenWidth = window.innerWidth;
  private screenHeight = window.innerHeight;

  prepare(data: EducationLevelSceneData) {
    this.layout = { width: '100%', height: '100%' };

    this.background = new Background();
    this.soundButton = new SoundButton();
    this.letterGrid = new LetterGrid({ onComplete: () => this.onRoundComplete() });
    this.mainCard = new MainCard(this.soundButton, this.letterGrid);
    this.homeButton = new HomeButton(data.onBack);
    this.helpButton = new HelpButton();

    this.soundButton.setLetter(this.letterGrid.getCorrectLetter());

    this.addChild(this.background, this.mainCard, this.homeButton, this.helpButton);
    this.alpha = 0;

    this.resize(this.screenWidth, this.screenHeight);
  }

  reset() {
    this.background = undefined;
    this.mainCard = undefined;
    this.letterGrid = undefined;
    this.soundButton = undefined;
    this.homeButton = undefined;
    this.helpButton = undefined;
    this.layout = null;
  }

  show() {
    this.alpha = 1;
  }

  hide() {
    this.alpha = 0;
  }

  pause() {
    this.letterGrid?.pause();
  }

  resume() {
    this.letterGrid?.resume();
  }

  resize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.layout = { width, height };
    this.background?.resize(width, height);
    this.mainCard?.resize(width, height);
  }

  private onRoundComplete() {
    window.setTimeout(() => {
      if (!this.letterGrid || !this.soundButton) return;
      this.letterGrid.reset();
      this.soundButton.setLetter(this.letterGrid.getCorrectLetter());
    }, 800);
  }
}
