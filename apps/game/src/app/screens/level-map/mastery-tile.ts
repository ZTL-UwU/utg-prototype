import { animate } from 'motion';
import { Assets, Container, Graphics, Sprite, Text, Texture, type DestroyOptions } from 'pixi.js';

import { isLevelUnlocked } from '../../../lib/progression';
import { m } from '../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { getFontFamilyForScript } from '../../../utils/script';
import { makeLevelStop } from './level-stop';
import { findMapUnitForLevel, getLayerMaps, type TLevel } from './units';

/** The grid's own background; a level using it as its art gets a plain tile instead. */
export const MASTERY_BACKGROUND_ALIAS = 'game-levels/game-level-map/background.png';
const PADLOCK_ALIAS = 'locked-popup/padlock.png';

const RADIUS = 22;
const BORDER = 5;
const BORDER_COLOR = 0xffffff;
const PLAIN_FILL = 0x5d5f5a;
const LOCKED_FILL = 0x4a4c48;
const OVERLAY_COLOR = 0x1b2433;
const OVERLAY_ALPHA = 0.45;
const LOCKED_TINT = 0x8a8a8a;
const HOVER_SCALE = 1.04;

const TEXT_SHADOW = { color: 0x000000, alpha: 0.5, blur: 4, distance: 2, angle: Math.PI / 2 };

/** The level's own art: what its loading screen shows behind the tutorial. */
function artAlias(level: TLevel): string | undefined {
  const alias = level.screen?.loadingBackgroundAsset;
  return alias && alias !== MASTERY_BACKGROUND_ALIAS ? alias : undefined;
}

/**
 * Every game level's art, for the map screen to load (and keep loaded) while the grid is up.
 * Each sits in its level's own bundle, which only loads when the level starts.
 */
export function masteryArtAliases(): string[] {
  const aliases = getLayerMaps('game')
    .flatMap((mapUnit) => mapUnit.levels)
    .map(artAlias)
    .filter((alias): alias is string => !!alias);
  return [...new Set(aliases)];
}

/** One game level on The Mastery grid: "LEVEL n", its title, and its art behind a tint. */
export class MasteryTile extends Container {
  private readonly frame = new Graphics();
  private readonly artMask = new Graphics();
  private readonly art = new Container();
  private readonly overlay = new Graphics();
  private readonly levelText: Text;
  private readonly titleText?: Text;
  private readonly padlock?: Sprite;
  private artSprite?: Sprite;
  private readonly locked: boolean;
  private tileWidth = 0;
  private tileHeight = 0;
  private readonly playable: boolean;
  private readonly stopHover: () => void;

  constructor(level: TLevel, number: number, isDragging: () => boolean) {
    super();
    this.locked = !isLevelUnlocked(level);

    this.art.mask = this.artMask;
    this.levelText = new Text({
      text: m.mastery_level({ number }),
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: 64,
        fontWeight: 'bold',
        fill: 0xffffff,
        dropShadow: TEXT_SHADOW,
        padding: 6,
      },
      anchor: 0.5,
    });
    if (level.title) {
      this.titleText = new Text({
        text: level.title,
        style: {
          fontFamily: getFontFamilyForScript('Latin'),
          fontSize: 56,
          fill: 0xffffff,
          dropShadow: TEXT_SHADOW,
          padding: 6,
        },
        anchor: 0.5,
      });
    }
    if (this.locked && Assets.cache.has(PADLOCK_ALIAS)) {
      this.padlock = new Sprite({ texture: Texture.from(PADLOCK_ALIAS), anchor: 0.5 });
    }

    this.addChild(
      this.frame,
      this.art,
      this.artMask,
      this.overlay,
      this.levelText,
      ...(this.titleText ? [this.titleText] : []),
      ...(this.padlock ? [this.padlock] : []),
    );

    this.addArt(level);

    this.playable = !!level.screen;
    this.stopHover = makeLevelStop(this, {
      level,
      mapUnit: findMapUnitForLevel(level),
      isDragging,
      hoverScale: HOVER_SCALE,
    });
  }

  /** The level's art, loaded by the map screen; the tile stays plain when it is missing. */
  private addArt(level: TLevel) {
    const alias = artAlias(level);
    if (!alias || !Assets.cache.has(alias)) return;
    this.artSprite = new Sprite({ texture: Texture.from(alias), anchor: 0.5 });
    if (this.locked) this.artSprite.tint = LOCKED_TINT;
    this.art.addChild(this.artSprite);
  }

  /** Sizes the tile; its origin is its centre, so hover grows it in place. */
  public setSize(width: number, height: number) {
    this.tileWidth = width;
    this.tileHeight = height;
    const left = -width / 2;
    const top = -height / 2;

    this.frame
      .clear()
      .roundRect(left, top, width, height, RADIUS)
      .fill(this.locked ? LOCKED_FILL : PLAIN_FILL)
      .stroke({ color: BORDER_COLOR, width: BORDER, alignment: 1 });
    this.artMask.clear().roundRect(left, top, width, height, RADIUS).fill(0xffffff);
    this.overlay
      .clear()
      .roundRect(left, top, width, height, RADIUS)
      .fill({ color: OVERLAY_COLOR, alpha: OVERLAY_ALPHA });
    this.coverArt();

    // Text shrinks on small tiles; the tile is laid out at ~400 wide on desktop
    const textScale = Math.min(1, width / 520, height / 260);
    this.levelText.scale.set(textScale);
    this.levelText.y = this.titleText ? -height * 0.13 : 0;
    if (this.titleText) {
      const titleWidth = this.titleText.getLocalBounds().width || 1;
      this.titleText.scale.set(Math.min(textScale, (width * 0.9) / titleWidth));
      this.titleText.y = height * 0.17;
    }
    if (this.padlock) {
      this.padlock.scale.set((height * 0.22) / this.padlock.texture.height);
      this.padlock.position.set(width / 2 - height * 0.18, -height / 2 + height * 0.18);
    }
  }

  private coverArt() {
    const sprite = this.artSprite;
    if (!sprite || this.tileWidth === 0) return;
    const { width, height } = sprite.texture;
    sprite.scale.set(Math.max(this.tileWidth / width, this.tileHeight / height));
  }

  public async playEnter(delay: number) {
    const target = this.playable ? 1 : 0.5;
    this.alpha = 0;
    this.scale.set(0.9);
    await Promise.all([
      animate(this, { alpha: target }, { duration: 0.3, delay }),
      animate(this.scale, { x: 1, y: 1 }, { duration: 0.3, delay, ease: 'backOut' }),
    ]);
  }

  public override destroy(options?: DestroyOptions) {
    this.stopHover();
    super.destroy(options);
  }
}
