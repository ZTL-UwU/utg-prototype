import type { Ticker } from 'pixi.js';
import { Assets, BigPool, Container } from 'pixi.js';

import { ensureSentencesReady, REMOTE_SENTENCES_BUNDLE } from '../../zustandStores/sentenceStore';
import { ensureWordsReady, REMOTE_WORDS_BUNDLE } from '../../zustandStores/wordStore';
import type { CreationEngine } from '../engine';

export type TransitionOptions = {
  /** When false, screens that support it skip enter/exit motion. Defaults to true. */
  animate?: boolean;
};

/** Interface for app screens */
export interface AppScreen extends Container {
  /** Show the screen. Pass `false` to skip enter motion when supported. */
  show?(animate?: boolean): Promise<void>;
  /** Hide the screen. Pass `false` to skip exit motion when supported. */
  hide?(animate?: boolean): Promise<void>;
  /** Pause the screen */
  pause?(): Promise<void>;
  /** Resume the screen */
  resume?(): Promise<void>;
  /** Prepare screen, before showing */
  prepare?(): void;
  /** Reset screen, after hidden */
  reset?(): void;
  /** Update the screen, passing delta time/step */
  update?(time: Ticker): void;
  /** Resize the screen */
  resize?(width: number, height: number): void;
  /** Blur the screen */
  blur?(): void;
  /** Focus the screen */
  focus?(): void;
  /** Method to react on assets loading progress */
  onLoad?: (progress: number) => void;
}

/** Interface for app screens constructors */
export interface AppScreenConstructor<Args extends unknown[] = []> {
  new (...args: Args): AppScreen;
  /** List of assets bundles required by the screen */
  assetBundles?: string[];
  /** Load extra assets that depend on constructor props (before the screen is created). */
  prepareAssets?: (props?: unknown) => Promise<void>;
}

export class Navigation {
  /** Reference to the main application */
  public app!: CreationEngine;

  private readonly screenTickerHandlers = new WeakMap<AppScreen, (time: Ticker) => void>();
  private readonly screenChangeListeners = new Set<
    (ctor: AppScreenConstructor<any[]>, props?: unknown) => void
  >();

  /** Container for screens */
  public container = new Container();

  /** Application width */
  public width = 0;

  /** Application height */
  public height = 0;

  /** Constant background view for all screens */
  public background?: AppScreen;

  /** Current screen being displayed */
  public currentScreen?: AppScreen;

  /** Current popup being displayed */
  public currentPopup?: AppScreen;

  /** Popups suspended underneath the current popup */
  private readonly popupStack: AppScreen[] = [];

  public init(app: CreationEngine) {
    this.app = app;
  }

  /**
   * Screens that list remote catalog bundles need those catalogs registered
   * before Pixi can load the (possibly empty) bundle.
   */
  private async ensureBundlesReady(assetBundles?: string[]) {
    if (assetBundles?.includes(REMOTE_WORDS_BUNDLE)) {
      await ensureWordsReady();
    }
    if (assetBundles?.includes(REMOTE_SENTENCES_BUNDLE)) {
      await ensureSentencesReady();
    }
  }

  /** Subscribe to completed screen changes. */
  public onScreenChange(listener: (ctor: AppScreenConstructor<any[]>, props?: unknown) => void) {
    this.screenChangeListeners.add(listener);
    return () => this.screenChangeListeners.delete(listener);
  }

  /** Set the  default load screen */
  public setBackground(ctor: AppScreenConstructor) {
    this.background = new ctor();
    void this.addAndShowScreen(this.background);
  }

  /** Add screen to the stage, link update & resize functions */
  private async addAndShowScreen(screen: AppScreen, animate = true) {
    // Add navigation container to stage if it does not have a parent yet
    if (!this.container.parent) {
      this.app.stage.addChild(this.container);
    }

    // Add screen to stage
    this.container.addChild(screen);

    // Setup things and pre-organise screen before showing
    if (screen.prepare) {
      screen.prepare();
    }

    // Add screen's resize handler, if available
    if (screen.resize) {
      // Trigger a first resize
      screen.resize(this.width, this.height);
    }

    // Add update function if available
    if (screen.update) {
      const handler = (time: Ticker) => screen.update!(time);
      this.screenTickerHandlers.set(screen, handler);
      this.app.ticker.add(handler);
    }

    // Show the new screen
    if (screen.show) {
      screen.interactiveChildren = false;
      await screen.show(animate);
      screen.interactiveChildren = true;
    }
  }

  /** Remove screen from the stage, unlink update & resize functions */
  private async hideAndRemoveScreen(screen: AppScreen, animate = true) {
    // Prevent interaction in the screen
    screen.interactiveChildren = false;

    // Hide screen if method is available
    if (screen.hide) {
      await screen.hide(animate);
    }

    // Unlink update function if method is available
    const tickerHandler = this.screenTickerHandlers.get(screen);
    if (tickerHandler) {
      this.app.ticker.remove(tickerHandler);
      this.screenTickerHandlers.delete(screen);
    }

    // Remove screen from its parent (usually app.stage, if not changed)
    if (screen.parent) {
      screen.parent.removeChild(screen);
    }

    // Clean up the screen so that instance can be reused again later
    if (screen.reset) {
      screen.reset();
    }
  }

  /**
   * Hide current screen (if there is one) and present a new screen.
   * Any class that matches AppScreen interface can be used here.
   */
  public async showScreen(ctor: AppScreenConstructor): Promise<void>;
  public async showScreen<P>(ctor: AppScreenConstructor<[P]>, props: P): Promise<void>;
  public async showScreen(ctor: AppScreenConstructor, props?: unknown) {
    // Block interactivity in current screen
    if (this.currentScreen) {
      this.currentScreen.interactiveChildren = false;
    }

    // Load assets for the new screen, if available
    if (ctor.assetBundles) {
      await this.ensureBundlesReady(ctor.assetBundles);
      // Load all assets required by this new screen
      await Assets.loadBundle(ctor.assetBundles, (progress) => {
        if (this.currentScreen?.onLoad) {
          this.currentScreen.onLoad(progress * 100);
        }
      });
    }

    if (ctor.prepareAssets) {
      await ctor.prepareAssets(props);
    }

    if (this.currentScreen?.onLoad) {
      this.currentScreen.onLoad(100);
    }

    // If there is a screen already created, hide and destroy it
    if (this.currentScreen) {
      await this.hideAndRemoveScreen(this.currentScreen);
    }

    // Create the new screen and add that to the stage
    this.currentScreen =
      props !== undefined
        ? new (ctor as AppScreenConstructor<[unknown]>)(props)
        : BigPool.get(ctor);
    await this.addAndShowScreen(this.currentScreen);
    for (const listener of this.screenChangeListeners) {
      listener(ctor, props);
    }
  }

  /**
   * Resize screens
   * @param width Viewport width
   * @param height Viewport height
   */
  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.currentScreen?.resize?.(width, height);
    this.currentPopup?.resize?.(width, height);
    this.background?.resize?.(width, height);
  }

  /**
   * Show up a popup over current screen
   */
  public async showPopup(ctor: AppScreenConstructor): Promise<void>;
  public async showPopup<P>(
    ctor: AppScreenConstructor<[P]>,
    props: P,
    options?: TransitionOptions,
  ): Promise<void>;
  public async showPopup(ctor: AppScreenConstructor, props?: unknown, options?: TransitionOptions) {
    const animate = options?.animate ?? true;

    if (this.currentScreen) {
      this.currentScreen.interactiveChildren = false;
      await this.currentScreen.pause?.();
    }

    // Load assets for the new screen, if available
    // This is safe against multiple calls, since Repeated Loads Are Safe (https://pixijs.com/8.x/guides/components/assets#repeated-loads-are-safe)
    if (ctor.assetBundles) {
      await this.ensureBundlesReady(ctor.assetBundles);
      // Load all assets required by this new screen
      await Assets.loadBundle(ctor.assetBundles);
    }

    if (this.currentPopup) {
      await this.hideAndRemoveScreen(this.currentPopup, animate);
    }

    this.currentPopup =
      props !== undefined ? new (ctor as AppScreenConstructor<[unknown]>)(props) : new ctor();
    await this.addAndShowScreen(this.currentPopup, animate);
  }

  /**
   * Show a popup over the current popup.
   * Dismissing it restores the popup underneath instead of resuming the screen.
   */
  public async showNestedPopup(ctor: AppScreenConstructor): Promise<void>;
  public async showNestedPopup<P>(ctor: AppScreenConstructor<[P]>, props: P): Promise<void>;
  public async showNestedPopup(ctor: AppScreenConstructor, props?: unknown) {
    if (!this.currentPopup) {
      await this.showPopup(ctor, props);
      return;
    }

    const parentPopup = this.currentPopup;
    parentPopup.interactiveChildren = false;
    await parentPopup.pause?.();

    if (ctor.assetBundles) {
      await this.ensureBundlesReady(ctor.assetBundles);
      await Assets.loadBundle(ctor.assetBundles);
    }

    this.popupStack.push(parentPopup);
    this.currentPopup =
      props !== undefined ? new (ctor as AppScreenConstructor<[unknown]>)(props) : new ctor();
    await this.addAndShowScreen(this.currentPopup);
  }

  /**
   * Dismiss current popup, if there is one
   */
  public async hidePopup() {
    if (!this.currentPopup) return;
    const popup = this.currentPopup;
    this.currentPopup = undefined;
    await this.hideAndRemoveScreen(popup);

    const parentPopup = this.popupStack.pop();
    if (parentPopup) {
      this.currentPopup = parentPopup;
      parentPopup.interactiveChildren = true;
      await parentPopup.resume?.();
      return;
    }

    if (this.currentScreen) {
      this.currentScreen.interactiveChildren = true;
      void this.currentScreen.resume?.();
    }
  }

  /**
   * Blur screens when lose focus
   */
  public blur() {
    this.currentScreen?.blur?.();
    this.currentPopup?.blur?.();
    this.background?.blur?.();
  }

  /**
   * Focus screens
   */
  public focus() {
    this.currentScreen?.focus?.();
    this.currentPopup?.focus?.();
    this.background?.focus?.();
  }
}
