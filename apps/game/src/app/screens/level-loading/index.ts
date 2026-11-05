import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { topClearance } from '../../../engine/utils/viewport';
import { isLevelUnlocked } from '../../../lib/progression';
import useSessionStore from '../../../zustandStores/sessionStore';
import { LockedLevelPopup } from '../../popups/locked-level';
import { HUD } from '../../ui/hud';
import { RoundedProgressBar } from '../../ui/rounded-progress-bar';
import { LevelMapScreen } from '../level-map';
import type { TLayer, TLevel, TMapUnit } from '../level-map/units';

type LevelLoadingProps = { level: TLevel; mapUnit: TMapUnit };

const LAYER_COLORS: Record<TLayer, number> = {
  education: 0x0d8583,
  typing: 0xc45a14,
  game: 0x7e5433,
};

const SKIP_BUTTON = 'tutorial-popups/exit-button.svg';
/** How long each tutorial image stays up before the next one, or the level. */
const SLIDE_MS = 3000;

/**
 * Plays a level's tutorial images while the level loads, then starts it. Levels without
 * tutorial images get the progress bar alone. Every way into a level comes through here,
 * so each attempt starts a fresh session.
 */
export class LevelLoadingScreen extends Container {
  public readonly screenName = 'LevelLoadingScreen';
  /** `ui` for the back button. The level's own assets load in the background, see below. */
  public static assetBundles = ['ui'];
  /** Only this level's tutorial images, not the whole `tutorial-popups` bundle. */
  public static assets(props: unknown) {
    const help = (props as LevelLoadingProps).level.screen?.helpAssets ?? [];
    return help.length ? [...help, SKIP_BUTTON] : [];
  }

  private readonly level: TLevel;
  private readonly mapUnit: TMapUnit;
  private readonly slides: string[];

  private readonly backdrop = new Graphics();
  private readonly slide?: Sprite;
  private readonly skipButton?: FancyButton;
  private readonly progressBar = new RoundedProgressBar();
  private readonly hud: HUD;

  private slideIndex = 0;
  private slideElapsedMs = 0;
  private slidesDone: boolean;
  private loadProgress = 0;
  private loaded = false;
  /**
   * Whether the enter animation is over. Hiding the screen earlier would cancel it, leaving
   * `show()`, and the navigation waiting on it, unresolved for good.
   */
  private entered = false;
  /** Set once the level is started or the player has left, so neither happens twice. */
  private finished = false;

  constructor({ level, mapUnit }: LevelLoadingProps) {
    super({ layout: { width: '100%', height: '100%' } });
    this.level = level;
    this.mapUnit = mapUnit;
    this.slides = level.screen?.helpAssets ?? [];
    this.slidesDone = this.slides.length === 0;

    this.backdrop.layout = { position: 'absolute', width: '100%', height: '100%' };
    this.addChild(this.backdrop);

    if (this.slides.length) {
      this.slide = new Sprite({
        texture: Texture.from(this.slides[0]!),
        anchor: 0.5,
        layout: {
          position: 'absolute',
          width: '84%',
          height: '84%',
          top: '8%',
          left: '8%',
          objectFit: 'contain',
        },
      });

      this.skipButton = new FancyButton({ defaultView: SKIP_BUTTON });
      this.skipButton.onPress.connect(() => {
        void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        this.slidesDone = true;
        this.tryStart();
      });
      this.addChild(this.slide, this.skipButton);
    }

    this.addChild(this.progressBar);

    this.hud = new HUD({ onBack: () => this.leave() });
    this.addChild(this.hud);

    // Starts right away, so the level loads while its tutorial plays.
    if (level.screen) {
      void engine()
        .navigation.preload(level.screen, level, (progress) => {
          this.loadProgress = progress;
        })
        .then(() => {
          this.loadProgress = 1;
          this.loaded = true;
          this.tryStart();
        });
    }
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.backdrop.clear().rect(0, 0, width, height).fill(LAYER_COLORS[this.mapUnit.type]);

    if (this.skipButton) {
      const size = 80;
      this.skipButton.layout = {
        isLeaf: true,
        position: 'absolute',
        top: 50 + topClearance(height),
        right: 50,
        width: size,
        height: size,
      };
    }

    this.progressBar.x = (width - this.progressBar.width) / 2;
    this.progressBar.y = height - this.progressBar.height - 32;
  }

  public async show() {
    const shown = [this.slide, this.progressBar].filter((element) => element !== undefined);
    for (const element of shown) element.alpha = 0;
    this.slide?.scale.set(0.5);

    await Promise.all([
      ...shown.map((element) => animate(element, { alpha: 1 }, { duration: 0.6, ease: 'backOut' })),
      ...(this.slide
        ? [animate(this.slide.scale, { x: 1, y: 1 }, { duration: 0.6, ease: 'backOut' })]
        : []),
    ]);
    this.entered = true;
    this.tryStart();
  }

  public async hide() {
    this.finished = true;
    const shown = [this.slide, this.progressBar].filter((element) => element !== undefined);
    await Promise.all(
      shown.map((element) => animate(element, { alpha: 0 }, { duration: 0.3, ease: 'easeOut' })),
    );
  }

  public update(ticker: Ticker) {
    if (!this.slidesDone) {
      this.slideElapsedMs += ticker.deltaMS;
      if (this.slideElapsedMs >= SLIDE_MS) this.nextSlide();
    }

    // Tutorial time and loading both have to finish, so the bar follows whichever is behind.
    const slideProgress = this.slidesDone
      ? 1
      : (this.slideIndex + this.slideElapsedMs / SLIDE_MS) / this.slides.length;
    this.progressBar.progress = Math.min(slideProgress, this.loadProgress);
  }

  private nextSlide() {
    if (this.slideIndex >= this.slides.length - 1) {
      this.slidesDone = true;
      this.tryStart();
      return;
    }
    this.slideIndex += 1;
    this.slideElapsedMs = 0;
    this.slide!.texture = Texture.from(this.slides[this.slideIndex]!);
  }

  /** Open the level once its tutorial is over and it has loaded. */
  private tryStart() {
    if (this.finished || !this.entered || !this.slidesDone || !this.loaded) return;
    // Leaving through the browser's Back already has another screen on its way.
    if (!this.level.screen || engine().navigation.changingScreen) return;
    this.finished = true;

    void engine().audio.sfx.play('preload-audio/sfx/game-start.mp3');
    useSessionStore.getState().startSession(this.mapUnit.type);

    // Locked levels open behind the locked notice, which sends the player back to the map.
    const locked = !isLevelUnlocked(this.level);
    void engine()
      .navigation.showScreen(this.level.screen, this.level)
      .then(() => {
        if (!locked) return;
        void engine().navigation.showPopup(LockedLevelPopup, {
          layer: this.mapUnit.type,
          onClose: () => void engine().navigation.showScreen(LevelMapScreen, this.mapUnit),
        });
      });
  }

  private leave() {
    if (this.finished) return;
    this.finished = true;
    void engine().navigation.showScreen(LevelMapScreen, this.mapUnit);
  }
}
