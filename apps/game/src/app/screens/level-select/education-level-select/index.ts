import { animate } from 'motion';
import { Container, Text, type TextDropShadow } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { responsive, topClearance } from '../../../../engine/utils/viewport';
import { m } from '../../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';
import { convertToCurrentScript, getScriptFontFamily } from '../../../../utils/script';
import { HUD } from '../../../ui/hud';
import { EducationTutorialScreen } from '../../education-level/level-tutorial';
import { LayerSelectScreen } from '../../layer-select';
import { LevelMapScreen } from '../../level-map';
import { SheepMap } from './sheep-map';

/** Phones drop the titles below the back button and script pill, which would cover them. */
const TITLE_TOP = { sm: 170, lg: 100 };
const SUBTITLE_TOP = { sm: 310, lg: 300 };
/** Extra margin so drop shadows don't peek in from the screen edge. */
const OFF_SCREEN_MARGIN = 40;

export class EducationLevelSelect extends Container {
  public readonly screenName = 'EducationLevelSelect';
  public static assetBundles = [
    'education-level',
    'education-level-map',
    'mascots',
    'locked-popup',
    'ui',
  ];

  private map: SheepMap;
  private hud: HUD;
  private title: Text;
  private titleTop = responsive(TITLE_TOP) + topClearance(engine().navigation.height);
  private subtitleTop = responsive(SUBTITLE_TOP) + topClearance(engine().navigation.height);
  private subtitle: Text;
  /** How far the phone map is scrolled; the titles ride along with it. */
  private scrollY = 0;
  private titlesAnimating = false;
  private viewWidth = 0;
  private viewHeight = 0;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.map = this.createMap();

    this.hud = new HUD({
      onBack: () => void engine().navigation.showScreen(LayerSelectScreen),
      help: {
        kind: 'tutorial',
        onPress: () => void engine().navigation.showScreen(EducationTutorialScreen, {}),
      },
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

    this.addChild(this.map, this.title, this.subtitle, this.hud);
  }

  private createMap() {
    const map = new SheepMap(
      (mapUnit) => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
    );
    map.onScroll = (scrollY) => {
      this.scrollY = scrollY;
      if (this.titlesAnimating) return;
      this.title.y = scrollY;
      this.subtitle.y = scrollY;
    };
    return map;
  }

  /** Fresh map on every visit, so locks, the sheep and completion hops match the latest results. */
  private rebuildMap() {
    const index = this.getChildIndex(this.map);
    this.removeChild(this.map);
    this.map.destroy({ children: true });
    this.scrollY = 0;
    this.map = this.createMap();
    this.addChildAt(this.map, index);
    if (this.viewWidth > 0) this.map.resize(this.viewWidth, this.viewHeight);
  }

  public resize(width: number, height: number) {
    this.viewWidth = width;
    this.viewHeight = height;
    this.layout = { width, height };
    this.map.resize(width, height);
  }

  /** The y offset that moves an element fully above the top screen edge. */
  private offScreenY(element: Container, layoutTop: number) {
    return -(layoutTop + element.getLocalBounds().maxY + OFF_SCREEN_MARGIN);
  }

  public async show() {
    this.rebuildMap();
    this.titlesAnimating = true;
    this.title.y = this.offScreenY(this.title, this.titleTop);
    this.subtitle.y = this.offScreenY(this.subtitle, this.subtitleTop);

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
        { y: this.offScreenY(this.title, this.titleTop) },
        { duration: 0.2, ease: 'backIn' },
      ),
      animate(
        this.subtitle,
        { y: this.offScreenY(this.subtitle, this.subtitleTop) },
        { duration: 0.2, ease: 'backIn' },
      ),
      this.map.playExitAnimation(),
    ]);
  }
}
