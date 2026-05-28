import { animate } from 'motion';
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

const TITLE_LAYOUT_TOP = 30;
const TITLE_OFFSCREEN = 200;

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
        top: TITLE_LAYOUT_TOP,
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
      this.endButton,
      this.title,
      this.letterRow,
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

  private get titleOffscreenY() {
    return -(TITLE_OFFSCREEN + TITLE_LAYOUT_TOP);
  }

  public async show() {
    useKeyboardStore.setState({ showKeyboard: true });

    this.title.y = this.titleOffscreenY;

    await Promise.all([
      animate(this.title, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      this.letterRow.playEnterAnimation(),
    ]);
  }

  public async hide() {
    useKeyboardStore.setState({ showKeyboard: false });

    await Promise.all([
      animate(this.title, { y: this.titleOffscreenY }, { duration: 0.2, ease: 'backIn' }),
      this.letterRow.playExitAnimation(),
    ]);
  }
}
