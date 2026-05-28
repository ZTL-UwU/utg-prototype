import { animate } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { QuitPopup } from '../../popups/quit';
import { BackButton } from '../../ui/back-button';
import { EndButton } from '../../ui/end-button';
import { HelpButton } from '../../ui/help-button';
import { KeyboardLayout } from '../../ui/keyboard-layout';
import { LevelMapScreen } from '../level-map';
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
  private keyboard: KeyboardLayout;

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
      void engine().navigation.showPopup(QuitPopup, {
        type: 'typing',
        onQuit: () => {
          void engine().navigation.showScreen(LevelMapScreen, 'typing');
        },
      });
    });
    this.helpButton = new HelpButton();
    this.endButton = new EndButton('typing');
    this.keyboard = new KeyboardLayout();
    this.addChild(
      this.background,
      this.clouds,
      this.camel,
      this.backButton,
      this.helpButton,
      this.title,
      this.letterRow,
      this.endButton,
      this.keyboard,
    );
  }

  public async pause() {
    await this.keyboard.pause();
    await this.letterRow.pause();
    await this.clouds.pause();
    await this.camel.pause();
  }

  public async resume() {
    await this.keyboard.resume();
    await this.letterRow.resume();
    await this.clouds.resume();
    await this.camel.resume();
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
    this.clouds.resize(width, height);
    this.camel.resize(width, height);
    this.keyboard.resize(width, height);
  }

  private get titleOffscreenY() {
    return -(TITLE_OFFSCREEN + TITLE_LAYOUT_TOP);
  }

  public async show() {
    void this.keyboard.resume();

    this.title.y = this.titleOffscreenY;

    await Promise.all([
      animate(this.title, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      this.letterRow.playEnterAnimation(),
      this.keyboard.playEnterAnimation(),
    ]);
  }

  public async hide() {
    void this.keyboard.pause();

    await Promise.all([
      animate(this.title, { y: this.titleOffscreenY }, { duration: 0.2, ease: 'backIn' }),
      this.letterRow.playExitAnimation(),
      this.keyboard.playExitAnimation(),
    ]);
  }

  public reset() {
    this.letterRow.destroy({ children: true });
  }
}
