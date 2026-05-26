import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { BackButton } from '../../ui/back-button';
import { HelpButton } from '../../ui/help-button';
import { HomeScreen } from '../home';
import { LevelRow } from './level-row';
export class EducationLevelMapScreen extends Container {
  public static assetBundles = ['education-level-map', 'ui'];
  private background: Sprite;
  private title: Text;
  private levelRow: LevelRow;
  private backButton: BackButton;
  private helpButton: HelpButton;

  constructor() {
    super();
    this.background = new Sprite({
      texture: Texture.from('education-level-map/background.svg'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.title = new Text({
      text: 'LEARN THE UYGHUR ALPHABET',
      style: {
        fontFamily: 'Concert One',
        fontSize: 150,
        fontWeight: '800',
        fill: 0x6b3f1f,
      },
      layout: {
        position: 'absolute',
        top: 140,
        left: 50,
      },
    });

    this.backButton = new BackButton(() => {
      void engine().navigation.showScreen(HomeScreen);
    });
    this.helpButton = new HelpButton();
    this.levelRow = new LevelRow();
    this.backButton = new BackButton(() => {
      void engine().navigation.showScreen(HomeScreen);
    });
    this.helpButton = new HelpButton();
    this.addChild(this.background, this.title, this.backButton, this.helpButton, this.levelRow);
  }
  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }
}
