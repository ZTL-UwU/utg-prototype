import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { DropShadowFilter } from 'pixi-filters';
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive } from '../../../engine/utils/viewport';
import { isMapUnitUnlocked } from '../../../lib/progression';
import { m } from '../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { convertToCurrentScript, getScriptFontFamily } from '../../../utils/script';
import { HUD } from '../../ui/hud';
import { MAP_SHEEP_BUNDLES } from '../../ui/map-sheep';
import { fitTitleScale, mapTitleTops, offScreenY } from '../../ui/map-titles';
import { LayerSelectScreen } from '../layer-select';
import { EducationLevelSelect } from '../level-select/education-level-select';
import { TypingTutorialScreen } from '../typing-level/level-tutorial';
import { CurvedText } from './curved-text';
import { LevelRow } from './level-row';
import { MasteryGrid } from './mastery-grid';
import { masteryArtAliases } from './mastery-tile';
import { TypingJourney } from './typing-journey';
import { getLayerMaps, getNextMap, getPrevMap, type TMapUnit } from './units';

const NAV_BUTTON_SIZE = 120;
const NAV_BUTTON_FACE = 0xa66129;
const NAV_BUTTON_SHADOW = 0x7a5520;
/** A next unit that is still locked shows its >> button faded. */
const LOCKED_NAV_ALPHA = 0.45;
/** Phones put the << >> buttons this far above the bottom, clear of the level path. */
const PHONE_NAV_BOTTOM = 200;
const NAV_SIDE_INSET = { sm: 90, lg: 40 };

/**
 * What a map screen shows under its title: an education unit's row of level buttons, or the
 * whole-layer overview of the typing and game layers.
 */
interface MapBody extends Container {
  resize(width: number, height: number): void;
  playEnterAnimation(): Promise<void>;
  playExitAnimation(): Promise<void>;
  /** Runs once the screen has entered, such as a completion hop. */
  afterEnter?(): Promise<void>;
  /** Overviews scroll, and the title rides along. */
  onScroll?: (scrollY: number) => void;
  /** Where the title ends, for bodies that start below it. */
  titleBottom?: number;
}

function createTitleShadow() {
  return new DropShadowFilter({ color: 0x000000, blur: 8, quality: 5, offset: { x: 0, y: 0 } });
}

function createMapNavButton(label: string, onPress: () => void) {
  const size = NAV_BUTTON_SIZE;
  const button = new FancyButton({
    defaultView: new Graphics()
      .roundRect(0, 10, size, size, 20)
      .fill(NAV_BUTTON_SHADOW)
      .roundRect(0, 0, size, size, 20)
      .fill(NAV_BUTTON_FACE),
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
  button.onPress.connect(() => {
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
    onPress();
  });
  return button;
}

/** The HUD's Back leaves for the layer's chooser; Help opens the layer's tutorial. */
function createMapHud(mapUnit: TMapUnit) {
  return new HUD({
    onBack: () =>
      void engine().navigation.showScreen(
        mapUnit.type === 'education' ? EducationLevelSelect : LayerSelectScreen,
      ),
    help:
      mapUnit.type === 'typing'
        ? {
            kind: 'tutorial',
            onPress: () =>
              void engine().navigation.showScreen(
                TypingTutorialScreen,
                getLayerMaps('typing')[0] ?? mapUnit,
              ),
          }
        : { kind: 'tutorial', mapUnit, presentation: 'screen' },
  });
}

export class LevelMapScreen extends Container {
  public readonly screenName = 'LevelMapScreen';
  public static assetBundles = [
    'typing-level-map',
    'game-level-map',
    ...MAP_SHEEP_BUNDLES,
    'locked-popup',
    'end-screen',
    'ui',
  ];

  /** The Mastery grid shows each game level's art, which lives in that level's own bundle. */
  public static assets(props?: unknown): string[] {
    return (props as TMapUnit | undefined)?.type === 'game' ? masteryArtAliases() : [];
  }

  private background: Sprite;
  private readonly mapUnit: TMapUnit;
  /** Typing and game maps show one overview of the whole layer instead of a single unit. */
  private readonly overview: boolean;
  private title: CurvedText | Text;
  /** Where the titles sit, set in `resize`. */
  private titleTop = 0;
  private subtitleTop = 0;
  private subtitle?: Text;
  private body: MapBody;
  private hud: HUD;
  /** How far the overview is scrolled; the title rides along with it. */
  private scrollY = 0;
  private titleAnimating = false;
  private nextMapButton?: FancyButton;
  private prevMapButton?: FancyButton;

  constructor(mapUnit: TMapUnit) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });
    this.mapUnit = mapUnit;
    this.overview = mapUnit.type !== 'education';
    this.background = new Sprite({
      texture: Texture.from(mapUnit.background),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });
    this.hud = createMapHud(mapUnit);
    this.title = this.createTitle();
    this.subtitle = this.createSubtitle();
    this.body = this.createBody();

    // The overviews show every unit of their layer at once, so they have no << >> paging
    const prevMap = this.overview ? undefined : getPrevMap(mapUnit);
    if (prevMap) {
      this.prevMapButton = createMapNavButton(
        '<<',
        () => void engine().navigation.showScreen(LevelMapScreen, prevMap),
      );
    }
    const nextMap = this.overview ? undefined : getNextMap(mapUnit);
    if (nextMap) {
      this.nextMapButton = createMapNavButton(
        '>>',
        () => void engine().navigation.showScreen(LevelMapScreen, nextMap),
      );
      if (!isMapUnitUnlocked(nextMap)) this.nextMapButton.alpha = LOCKED_NAV_ALPHA;
    }

    this.addChild(
      // The overviews bring their own background, which scrolls with them
      ...(this.overview ? [this.body] : [this.background]),
      this.title,
      ...(this.subtitle ? [this.subtitle] : []),
      ...(this.overview ? [] : [this.body]),
      ...(this.prevMapButton ? [this.prevMapButton] : []),
      ...(this.nextMapButton ? [this.nextMapButton] : []),
      this.hud,
    );
  }

  /** The unit's title, or the overview's name; curved when the unit asks for it. */
  private createTitle() {
    const { title, type } = this.mapUnit;
    const style = {
      fontFamily: DISPLAY_FONT_FAMILY,
      fontSize: title.fontSize,
      fontWeight: '800' as const,
      fill: title.fontColor,
      padding: 30,
    };
    const text = this.overview
      ? new Text({
          text: type === 'typing' ? m.typing_journey() : m.game_mastery(),
          style: { ...style, fill: 0xffffff },
        })
      : title.isCurved
        ? new CurvedText({ text: title.text, style })
        : new Text({
            text: title.text,
            style: { ...style, ...(title.dropShadow && { dropShadow: title.dropShadow }) },
          });
    text.filters = [createTitleShadow()];
    // Shrink from the top edge, so a scaled-down title stays clear of the subtitle.
    text.layout = { position: 'absolute', transformOrigin: 'center top' };
    return text;
  }

  /** The unit's name in the player's script, under its title; overviews have none. */
  private createSubtitle() {
    const { subtitle } = this.mapUnit;
    if (!subtitle || this.overview) return undefined;
    const text = new Text({
      text: convertToCurrentScript(subtitle.text),
      style: {
        fontFamily: getScriptFontFamily(),
        fontSize: subtitle.fontSize,
        fontWeight: '700',
        fill: subtitle.fontColor,
        padding: 30,
      },
      filters: [createTitleShadow()],
    });
    text.layout = { position: 'absolute' };
    return text;
  }

  private createBody(): MapBody {
    const { mapUnit } = this;
    if (!this.overview) return new LevelRow(mapUnit);
    const body = mapUnit.type === 'typing' ? new TypingJourney(mapUnit) : new MasteryGrid();
    body.onScroll = (scrollY) => {
      this.scrollY = scrollY;
      if (!this.titleAnimating) this.title.y = scrollY;
    };
    return body;
  }

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    this.layout = { width, height };

    const tops = mapTitleTops(height);
    this.titleTop = tops.title;
    this.subtitleTop = tops.subtitle;
    if (this.overview && this.title instanceof Text) {
      this.title.style.fontSize = responsive({ sm: 120, lg: 170 });
    }
    const titleBounds = this.title.getLocalBounds();
    this.title.layout = {
      top: this.titleTop,
      width: titleBounds.width,
      height: titleBounds.height,
    };
    this.title.scale.set(fitTitleScale(width, titleBounds.width));
    if (this.subtitle) this.subtitle.layout = { top: this.subtitleTop };

    // Bodies that start under the title do so however tall it renders on this screen
    this.body.titleBottom = this.titleTop + titleBounds.maxY * this.title.scale.y;
    this.body.resize(width, height);

    const navButtonY = responsive({ sm: height - PHONE_NAV_BOTTOM, lg: height / 2 });
    const navInset = responsive(NAV_SIDE_INSET);
    this.prevMapButton?.position.set(navInset, navButtonY);
    this.nextMapButton?.position.set(width - navInset, navButtonY);
  }

  public async show() {
    engine().audio.bgm.setVolume(0.5);
    this.titleAnimating = true;
    this.title.y = offScreenY(this.title, this.titleTop);
    if (this.subtitle) this.subtitle.y = offScreenY(this.subtitle, this.subtitleTop);

    const animations = [
      animate(this.title, { y: this.scrollY }, { duration: 0.4, ease: 'backOut' }),
      ...(this.subtitle
        ? [animate(this.subtitle, { y: 0 }, { duration: 0.4, ease: 'backOut' })]
        : []),
      this.body.playEnterAnimation(),
    ];

    if (this.prevMapButton) {
      const naturalX = this.prevMapButton.x;
      this.prevMapButton.x = naturalX - engine().navigation.width;
      animations.push(
        animate(this.prevMapButton, { x: naturalX }, { duration: 0.4, ease: 'easeOut' }),
      );
    }

    if (this.nextMapButton) {
      const naturalX = this.nextMapButton.x;
      this.nextMapButton.x = naturalX + engine().navigation.width;
      animations.push(
        animate(this.nextMapButton, { x: naturalX }, { duration: 0.4, ease: 'easeOut' }),
      );
    }

    await Promise.all(animations);
    this.titleAnimating = false;
    this.title.y = this.scrollY;
    await this.body.afterEnter?.();
  }

  public async hide() {
    this.titleAnimating = true;
    const animations = [
      animate(
        this.title,
        { y: offScreenY(this.title, this.titleTop) },
        { duration: 0.2, ease: 'backIn' },
      ),
      ...(this.subtitle
        ? [
            animate(
              this.subtitle,
              { y: offScreenY(this.subtitle, this.subtitleTop) },
              { duration: 0.2, ease: 'backIn' },
            ),
          ]
        : []),
      this.body.playExitAnimation(),
    ];

    if (this.prevMapButton) {
      animations.push(
        animate(
          this.prevMapButton,
          { x: this.prevMapButton.x - engine().navigation.width },
          { duration: 0.2, ease: 'easeIn' },
        ),
      );
    }

    if (this.nextMapButton) {
      animations.push(
        animate(
          this.nextMapButton,
          { x: this.nextMapButton.x + engine().navigation.width },
          { duration: 0.2, ease: 'easeIn' },
        ),
      );
    }

    await Promise.all(animations);
  }
}
