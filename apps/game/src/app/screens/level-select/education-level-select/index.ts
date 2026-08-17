import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, Sprite, Text, Texture, type TextDropShadow } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { convertToCurrentScript, getScriptFontFamily } from '../../../../utils/script';
import { HUD } from '../../../ui/hud';
import { LayerSelectScreen } from '../../layer-select';
import { EducationMapRow } from './education-map-row';

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
      style: { fontFamily: 'Concert One', fontSize: 80, fill: 0xfff4e0 },
    }),
    animations: {
      hover: { props: { scale: { x: 1.1, y: 1.1 } }, duration: 100 },
      pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
    },
    anchor: 0.5,
  });
}

export class EducationLevelSelect extends Container {
  public static assetBundles = ['education-level', 'education-level-map', 'ui'];

  private background: Sprite;
  private mapRow: EducationMapRow;
  private hud: HUD;
  private title: Text;
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
        await this.mapRow.prevPage(engine().navigation.height);
        this.updateNavButtons();
      })();
    });

    this.nextMapButton = createMapNavButton('>>');
    this.nextMapButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void (async () => {
        await this.mapRow.nextPage(engine().navigation.height);
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
      text: 'ALPHABETS',
      style: {
        fontFamily: 'Concert One',
        fontSize: 180,
        fontWeight: '800',
        fill: 0xffffff,
        dropShadow: textDropShadow,
        padding: 8,
      },
    });
    this.title.layout = {
      position: 'absolute',
      top: 100,
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
      top: 300,
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
    this.prevMapButton.position.set(40, height / 2);
    this.nextMapButton.position.set(width - 40, height / 2);
  }

  public async show() {
    this.title.y = -(300 + 120);
    this.subtitle.y = -(300 + 120);
    this.updateNavButtons();

    const animations = [
      animate(this.title, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      animate(this.subtitle, { y: 0 }, { duration: 0.4, ease: 'backOut' }),
      this.mapRow.playEnterAnimation(engine().navigation.height),
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
      animate(this.title, { y: -(300 + 120) }, { duration: 0.2, ease: 'backIn' }),
      animate(this.subtitle, { y: -(300 + 120) }, { duration: 0.2, ease: 'backIn' }),
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
      this.mapRow.playExitAnimation(engine().navigation.height),
    ]);
  }
}
