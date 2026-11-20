import { animate } from 'motion';
import { Container, Text } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { responsive } from '../../../../engine/utils/viewport';
import { m } from '../../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';
import { convertToCurrentScript, getScriptFontFamily } from '../../../../utils/script';
import { HUD } from '../../../ui/hud';
import { MAP_SHEEP_BUNDLES } from '../../../ui/map-sheep';
import { fitTitleScale, mapTitleTops, offScreenY } from '../../../ui/map-titles';
import { BACKDROP_TEXT_SHADOW } from '../../../ui/primary-button';
import { EducationTutorialScreen } from '../../education-level/level-tutorial';
import { LayerSelectScreen } from '../../layer-select';
import { LevelMapScreen } from '../../level-map';
import { SheepMap } from './sheep-map';

export class EducationLevelSelect extends Container {
  public readonly screenName = 'EducationLevelSelect';
  public static assetBundles = ['education-level', ...MAP_SHEEP_BUNDLES, 'locked-popup', 'ui'];

  private map: SheepMap;
  private hud: HUD;
  private title: Text;
  /** Where the titles sit, set in `resize`. */
  private titleTop = 0;
  private subtitleTop = 0;
  private subtitle: Text;
  /** How far the phone map is scrolled; the titles ride along with it. */
  private scrollY = 0;
  private titlesAnimating = false;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.map = new SheepMap(
      (mapUnit) => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
    );
    this.map.onScroll = (scrollY) => {
      this.scrollY = scrollY;
      if (this.titlesAnimating) return;
      this.title.y = scrollY;
      this.subtitle.y = scrollY;
    };

    this.hud = new HUD({
      onBack: () => void engine().navigation.showScreen(LayerSelectScreen),
      help: {
        kind: 'tutorial',
        onPress: () => void engine().navigation.showScreen(EducationTutorialScreen, {}),
      },
    });

    this.title = new Text({
      text: m.education_alphabets(),
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fontWeight: '800',
        fill: 0xffffff,
        dropShadow: BACKDROP_TEXT_SHADOW,
        padding: 8,
      },
    });
    // Shrink from the top edge, so a scaled-down title stays clear of the subtitle.
    this.title.layout = { position: 'absolute', transformOrigin: 'center top' };

    this.subtitle = new Text({
      text: convertToCurrentScript('ھەرپلەر'),
      style: {
        fontFamily: getScriptFontFamily(),
        fontSize: 100,
        fontWeight: '700',
        fill: 0xffffff,
        dropShadow: BACKDROP_TEXT_SHADOW,
        padding: 8,
      },
    });
    this.subtitle.layout = { position: 'absolute' };

    this.addChild(this.map, this.title, this.subtitle, this.hud);
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };

    const tops = mapTitleTops(height);
    this.titleTop = tops.title;
    this.subtitleTop = tops.subtitle;
    this.title.style.fontSize = responsive({ sm: 140, lg: 180 });
    const titleBounds = this.title.getLocalBounds();
    this.title.layout = {
      top: this.titleTop,
      width: titleBounds.width,
      height: titleBounds.height,
    };
    this.title.scale.set(fitTitleScale(width, titleBounds.width));
    this.subtitle.layout = { top: this.subtitleTop };

    // Lay the map out below the titles, so the sheep on rock 1 never covers them.
    this.map.titleBottom = this.subtitleTop + this.subtitle.getLocalBounds().maxY;
    this.map.resize(width, height);
  }

  public async show() {
    this.titlesAnimating = true;
    this.title.y = offScreenY(this.title, this.titleTop);
    this.subtitle.y = offScreenY(this.subtitle, this.subtitleTop);

    await Promise.all([
      animate(this.title, { y: this.scrollY }, { duration: 0.4, ease: 'backOut' }),
      animate(this.subtitle, { y: this.scrollY }, { duration: 0.4, ease: 'backOut' }),
      this.map.playEnterAnimation(),
    ]);
    this.titlesAnimating = false;
    this.title.y = this.scrollY;
    this.subtitle.y = this.scrollY;

    await this.map.playPendingHop();
  }

  public async hide() {
    this.titlesAnimating = true;
    await Promise.all([
      animate(
        this.title,
        { y: offScreenY(this.title, this.titleTop) },
        { duration: 0.2, ease: 'backIn' },
      ),
      animate(
        this.subtitle,
        { y: offScreenY(this.subtitle, this.subtitleTop) },
        { duration: 0.2, ease: 'backIn' },
      ),
      this.map.playExitAnimation(),
    ]);
  }
}
