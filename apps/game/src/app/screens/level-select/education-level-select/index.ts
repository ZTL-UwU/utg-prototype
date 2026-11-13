import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, Sprite, Text, Texture, type TextDropShadow } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { responsive, topClearance } from '../../../../engine/utils/viewport';
import { m } from '../../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';
import { convertToCurrentScript, getScriptFontFamily } from '../../../../utils/script';
import { HUD } from '../../../ui/hud';
import { LayerSelectScreen } from '../../layer-select';
import { EducationMapRow } from './education-map-row';

/** Phones drop the titles below the back button and script pill, which would cover them. */
const TITLE_TOP = { sm: 170, lg: 100 };
const SUBTITLE_TOP = { sm: 310, lg: 300 };
/** Extra margin so drop shadows don't peek in from the screen edge. */
const OFF_SCREEN_MARGIN = 40;

function createMapNavButton(label: string) {
  const size = 120;
  return new FancyButton({
    defaultView: new Graphics()
      .roundRect(0, 10, size, size, 20)
      .fill(0x7a5520)
      .roundRect(0, 0, size, size, 20)
      .fill(0xa66129),
    text: new Text({
      text: label,
      style: { fontFamily: DISPLAY_FONT_FAMILY, fontSize: 80, fill: 0xfff4e0 },
    }),
    animations: {
      hover: { props: { scale: { x: 1.1, y: 1.1 } }, duration: 100 },
      pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
    },
    anchor: 0.5,
  });
}

export class EducationLevelSelect extends Container {
  public readonly screenName = 'EducationLevelSelect';
  public static assetBundles = ['education-level', 'education-level-map', 'ui'];

  private background: Sprite;
  private mapRow: EducationMapRow;
  private hud: HUD;
  private title: Text;
  private titleTop = responsive(TITLE_TOP) + topClearance(engine().navigation.height);
  private subtitleTop = responsive(SUBTITLE_TOP) + topClearance(engine().navigation.height);
  private subtitle: Text;
  private prevMapButton: FancyButton;
  private nextMapButton: FancyButton;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level/background.png'),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.mapRow = new EducationMapRow();

    this.prevMapButton = createMapNavButton('<<');
    this.prevMapButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void (async () => {
        await this.mapRow.prevPage();
        this.updateNavButtons();
      })();
    });

    this.nextMapButton = createMapNavButton('>>');
    this.nextMapButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void (async () => {
        await this.mapRow.nextPage();
        this.updateNavButtons();
      })();
    });

    this.hud = new HUD({
      onBack: () => void engine().navigation.showScreen(LayerSelectScreen),
    });

    const textDropShadow: Partial<TextDropShadow> = {
      color: 0x000000,
      blur: 5,
      distance: 0,
      alpha: 0.75,
    };

    this.title = new Text({
      text: m.education_alphabets(),
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: responsive({ sm: 140, lg: 180 }),
        fontWeight: '800',
        fill: 0xffffff,
        dropShadow: textDropShadow,
        padding: 8,
      },
    });
    this.title.layout = {
      position: 'absolute',
      top: this.titleTop,
    };

    this.subtitle = new Text({
      text: convertToCurrentScript('ھەرپلەر'),
      style: {
        fontFamily: getScriptFontFamily(),
        fontSize: 100,
        fontWeight: '700',
        fill: 0xffffff,
        dropShadow: textDropShadow,
        padding: 8,
      },
    });
    this.subtitle.layout = {
      position: 'absolute',
      top: this.subtitleTop,
    };

    this.addChild(
      this.background,
      this.mapRow,
      this.prevMapButton,
      this.nextMapButton,
      this.hud,
      this.title,
      this.subtitle,
    );
  }

  /** Pooled screen: rebuild unit buttons so unlocks and rings match latest results. */
  public reset() {
    const index = this.getChildIndex(this.mapRow);
    this.removeChild(this.mapRow);
    this.mapRow.destroy({ children: true });
    this.mapRow = new EducationMapRow();
    this.addChildAt(this.mapRow, index);
  }

  private updateNavButtons() {
    this.prevMapButton.visible = this.mapRow.hasPrev;
    this.nextMapButton.visible = this.mapRow.hasNext;
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.mapRow.resize(width, height);
    const navButtonY = responsive({ sm: height - 200, lg: height / 2 });
    this.prevMapButton.position.set(responsive({ sm: 90, lg: 40 }), navButtonY);
    this.nextMapButton.position.set(width - responsive({ sm: 90, lg: 40 }), navButtonY);
  }

  /** The y offset that moves an element fully above the top screen edge. */
  private offScreenY(element: Container, layoutTop: number) {
    return -(layoutTop + element.getLocalBounds().maxY + OFF_SCREEN_MARGIN);
  }

  public async show() {
    this.title.y = this.offScreenY(this.title, this.titleTop);
    this.subtitle.y = this.offScreenY(this.subtitle, this.subtitleTop);
    this.updateNavButtons();

    const animations = [
      animate(this.title, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      animate(this.subtitle, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      this.mapRow.playEnterAnimation(),
    ];

    const prevNaturalX = this.prevMapButton.x;
    this.prevMapButton.x = prevNaturalX - engine().navigation.width;
    animations.push(
      animate(this.prevMapButton, { x: prevNaturalX }, { duration: 0.4, ease: 'easeOut' }),
    );

    const nextNaturalX = this.nextMapButton.x;
    this.nextMapButton.x = nextNaturalX + engine().navigation.width;
    animations.push(
      animate(this.nextMapButton, { x: nextNaturalX }, { duration: 0.4, ease: 'easeOut' }),
    );

    await Promise.all(animations);
  }

  public async hide() {
    await Promise.all([
      animate(
        this.title,
        { y: this.offScreenY(this.title, this.titleTop) },
        { duration: 0.2, ease: 'backIn' },
      ),
      animate(
        this.subtitle,
        { y: this.offScreenY(this.subtitle, this.subtitleTop) },
        { duration: 0.2, ease: 'backIn' },
      ),
      animate(
        this.prevMapButton,
        { x: this.prevMapButton.x - engine().navigation.width },
        { duration: 0.2, ease: 'easeIn' },
      ),
      animate(
        this.nextMapButton,
        { x: this.nextMapButton.x + engine().navigation.width },
        { duration: 0.2, ease: 'easeIn' },
      ),
      this.mapRow.playExitAnimation(),
    ]);
  }
}
