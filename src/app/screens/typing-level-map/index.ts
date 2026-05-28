import { animate } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { BackButton } from '../../ui/back-button';
import { HelpButton } from '../../ui/help-button';
import { HomeScreen } from '../home';
import { LevelRow } from './level-row';

export class TypingLevelMapScreen extends Container {
  public static assetBundles = ['typing-level-map', 'ui'];

  private background: Sprite;
  private title: Text;
  private levelRow: LevelRow;
  private backButton: BackButton;
  private helpButton: HelpButton;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.background = new Sprite({
      texture: Texture.from('typing-level-map/background.png'),
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
    };
  }

  public async show() {
    this.title.y = -(200 + 140);

    await Promise.all([
      animate(this.title, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      this.levelRow.playEnterAnimation(engine().navigation.height),
    ]);
  }

  public async hide() {
    const screenHeight = engine().navigation.height;

    await Promise.all([
      animate(this.title, { y: -(200 + 140) }, { duration: 0.2, ease: 'backIn' }),
      this.levelRow.playExitAnimation(screenHeight),
    ]);
  }
}
