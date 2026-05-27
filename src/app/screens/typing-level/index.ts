import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { useKeyboardStore } from '../../../zustandStores/keyboardStore';
import { BackButton } from '../../ui/back-button';
import { EndButton } from '../../ui/end-button';
import { HelpButton } from '../../ui/help-button';
import { TypingLevelMapScreen } from '../typing-level-map';
import { Camel } from './camel';
import { Clouds } from './clouds';
import { LetterRow } from './letter-row';

export class TypingLevelScreen extends Container {
  public static assetBundles = ['typing-level', 'ui'];

  private background: Sprite;
  private clouds: Clouds;
  private camel: Camel;
  private letterRow: LetterRow;
  private helpButton: HelpButton;
  private backButton: BackButton;
  private endButton: EndButton;
  private title: Text;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.background = new Sprite({
      texture: Texture.from('typing-level/background.png'),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.clouds = new Clouds();
    this.camel = new Camel();
    this.letterRow = new LetterRow();

    this.title = new Text({
      text: 'TAKLAMAKAN DESERT',
      style: {
        fontFamily: 'Concert One',
        fontSize: 100,
        fontWeight: '800',
        fill: 0x6b3f1f,
      },
      layout: {
        position: 'absolute',
        top: 30,
      },
    });

    this.backButton = new BackButton(() => {
      void engine().navigation.showScreen(TypingLevelMapScreen);
    });
    this.helpButton = new HelpButton();
    this.endButton = new EndButton();
    this.addChild(
      this.background,
      this.clouds,
      this.camel,
      this.backButton,
      this.helpButton,
      this.title,
      this.letterRow,
      this.endButton,
    );
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
    this.clouds.resize(width, height);
    this.camel.resize(width, height);
  }

  public async show() {
    useKeyboardStore.setState({ showKeyboard: true });
  }

  public async hide() {
    useKeyboardStore.setState({ showKeyboard: false });
  }
}
