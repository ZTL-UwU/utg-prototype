import { animate } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { responsive } from '../../../../engine/utils/viewport';
import { m } from '../../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';
import type { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { createLevelHud } from '../../level-flow';
import type { TLevel } from '../../level-map/units';
import { Camel } from './camel';
import { Clouds } from './clouds';
import { LetterRow } from './letter-row';

/** Phones drop the title below the corner buttons it would otherwise run into. */
const TITLE_LAYOUT_TOP = { sm: 170, lg: 30 };
const TITLE_FONT_SIZE = { sm: 72, lg: 100 };
const TITLE_OFFSCREEN = 200;
const PHONE_ROW_SCALE = 0.7;

/** Type the row of letters the camel walks past, a round at a time. */
export class TypingDesertScreen extends Container {
  public readonly screenName = 'TypingDesertScreen';
  public static assetBundles = ['typing-level', 'typing-level-desert', 'ui'];
  public static loadingBackgroundAsset = 'typing-levels/typing-level/background-taklamakan.png';
  public static helpAssets = ['tutorial-popups/typing-tutorial.png'];

  private background: Sprite;
  private clouds: Clouds;
  private camel: Camel;
  private letterRow: LetterRow;
  private hud: HUD;
  private title: Text;
  private keyboard: KeyboardLayout;

  constructor(level: TLevel) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level/background-taklamakan.png'),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.clouds = new Clouds();
    this.camel = new Camel();
    this.keyboard = new KeyboardLayout();
    this.letterRow = new LetterRow(this.keyboard, level);

    this.title = new Text({
      text: m.desert_title(),
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fontWeight: '800',
        fill: 0x6b3f1f,
      },
      layout: { position: 'absolute' },
    });

    this.hud = createLevelHud(level);

    this.addChild(
      this.background,
      this.clouds,
      this.camel,
      this.title,
      this.letterRow,
      this.keyboard,
      this.hud,
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
    this.letterRow.scale.set(responsive({ sm: PHONE_ROW_SCALE, lg: 1 }));
    this.title.style.fontSize = responsive(TITLE_FONT_SIZE);
    this.title.layout = { top: responsive(TITLE_LAYOUT_TOP) };
  }

  private get titleOffscreenY() {
    return -(TITLE_OFFSCREEN + responsive(TITLE_LAYOUT_TOP));
  }

  public async show() {
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
}
