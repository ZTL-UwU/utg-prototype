import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { BackButton } from '../../ui/back-button';
import { HelpButton } from '../../ui/help-button';
import { HomeScreen } from '../home';
import { LevelRow } from './level-row';

export class TypingLevelMapScreen extends Container {
  public static assetBundles = ['level-map', 'ui'];

  private background: Sprite;
  private title: Text;
  private levelRow: LevelRow;
  private backButton: BackButton;
  private helpButton: HelpButton;

  constructor() {
    super();

    this.background = new Sprite({
      texture: Texture.from('level-map/background.png'),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.backButton = new BackButton(() => {
      void engine().navigation.showScreen(HomeScreen);
    });

    this.helpButton = new HelpButton();

    this.title = new Text({
      text: 'TYPING JOURNEY',
      style: {
        fontFamily: 'Concert One',
        fontSize: 150,
        fontWeight: '800',
        fill: 0x6b3f1f,
      },
      layout: {
        position: 'absolute',
        top: 140,
      },
    });
    this.levelRow = new LevelRow();

    this.addChild(this.background, this.title, this.levelRow, this.backButton, this.helpButton);
  }

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    };
  }
}
