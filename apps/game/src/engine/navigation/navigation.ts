import type { Ticker } from 'pixi.js';
import { Assets, BigPool, Container, type ResolvedAsset } from 'pixi.js';

import { ensureMascotsReady, REMOTE_MASCOTS_BUNDLE } from '../../zustandStores/courseStore';
import { ensureRewardsReady, REMOTE_REWARDS_BUNDLE } from '../../zustandStores/rewardStore';
import { ensureSentencesReady, REMOTE_SENTENCES_BUNDLE } from '../../zustandStores/sentenceStore';
import type { CreationEngine } from '../engine';

export type TransitionOptions = {
  /** When false, screens that support it skip enter/exit motion. Defaults to true. */
  animate?: boolean;
};

/** Interface for app screens */
export interface AppScreen extends Container {
  /** Class name. A string so production minification cannot rename it. */
  readonly screenName: string;
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
  /** Asset bundles the screen needs, loaded before it is created and unloaded after it leaves. */
  assetBundles?: string[];
  /**
   * Single assets picked from the constructor props, such as one level's tutorial images or
   * words, handled like `assetBundles`. May wait for a catalog to know them. List assets whose
   * bundle no screen loads, or unloading one would also pull it out of that bundle.
   */
  assets?: (props?: unknown) => readonly string[] | Promise<readonly string[]>;
}

/** What a screen or popup needs loaded while it is up. */
type AssetNeeds = { bundles: readonly string[]; assets: readonly string[] };

/** Loaded once and kept: startup assets, and the shared UI nearly every screen uses. */
const PERSISTENT_BUNDLES: ReadonlySet<string> = new Set(['preload', 'preload-audio', 'ui']);

async function needsOf(ctor: AppScreenConstructor<any[]>, props?: unknown): Promise<AssetNeeds> {
  return { bundles: ctor.assetBundles ?? [], assets: (await ctor.assets?.(props)) ?? [] };
}

/**
 * One alias per file in these bundles and assets. `Assets.unloadBundle` would resolve a file
 * once per alias (AssetPack gives most two), unloading it twice: a cache warning for textures,
 * and a throw for sounds, which @pixi/sound cannot remove twice.
 */
function filesToUnload(bundles: readonly string[], assets: readonly string[]): string[] {
  const resolved = (
    bundles.length ? Object.values(Assets.resolver.resolveBundle([...bundles])) : []
  ) as Record<string, ResolvedAsset>[];
  resolved.push(Assets.resolver.resolve([...assets]));

  const aliasBySrc = new Map<string, string>();
  for (const entries of resolved) {
    for (const [alias, asset] of Object.entries(entries)) {
      if (asset.src && !aliasBySrc.has(asset.src)) aliasBySrc.set(asset.src, alias);
    }
  }
  return [...aliasBySrc.values()];
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

  /** Assets each screen and popup on stage needs, for deciding what is safe to unload. */
  private readonly screenNeeds = new WeakMap<AppScreen, AssetNeeds>();
  /** Bundles and single assets this class loaded and has not unloaded yet. */
  private readonly loadedBundles = new Set<string>();
  private readonly loadedAssets = new Set<string>();
  /** Loads in progress. Unloading waits for none, so it never races a load of the same file. */
  private loadsInFlight = 0;
  /** The unload pass in progress, which new loads wait out for the same reason. */
  private releasing: Promise<void> = Promise.resolve();
  /** A screen being loaded ahead of time (see `preload`), kept loaded until it is shown. */
  private reserved?: { ctor: AppScreenConstructor<any[]>; needs: AssetNeeds };
  /** Screens and popups loaded but not yet on stage, which unloading must leave alone. */
  private readonly pendingNeeds = new Set<AssetNeeds>();
  /** `showScreen` calls between starting and putting their screen on stage. */
  private screenChanges = 0;

  /** Whether another screen is on its way in, so the current one is about to leave. */
  public get changingScreen() {
    return this.screenChanges > 0;
  }

  public init(app: CreationEngine) {
    this.app = app;
  }

  /**
   * Screens that list remote catalog bundles need those catalogs registered
   * before Pixi can load the (possibly empty) bundle.
   */
  private async ensureBundlesReady(assetBundles?: readonly string[]) {
    if (assetBundles?.includes(REMOTE_SENTENCES_BUNDLE)) {
      await ensureSentencesReady();
    }
    if (assetBundles?.includes(REMOTE_REWARDS_BUNDLE)) {
      await ensureRewardsReady();
    }
    if (assetBundles?.includes(REMOTE_MASCOTS_BUNDLE)) {
      await ensureMascotsReady();
    }
  }

  /**
   * Load what a screen needs without letting one bad asset take the screen down.
   *
   * Pixi's loader defaults to `strategy: 'throw'` and resolves bundles with `Promise.all`,
   * so a single 404 rejects the whole bundle. Every `showScreen` call site is `void`-ed, so
   * that rejection would leave the screen unconstructed and the outgoing screen stuck with
   * `interactiveChildren = false` — the game appears frozen. Remote word media is the
   * realistic failure source (a missing recording), and a quiet screen beats a dead one.
   */
  private async load(needs: AssetNeeds, onProgress?: (progress: number) => void) {
    const { bundles, assets } = needs;
    const total = bundles.length + assets.length;
    if (total === 0) {
      onProgress?.(1);
      return;
    }

    this.loadsInFlight++;
    try {
      await this.releasing;
      await this.ensureBundlesReady(bundles);
      bundles.forEach((bundle) => this.loadedBundles.add(bundle));
      assets.forEach((asset) => this.loadedAssets.add(asset));

      // Each part reports its own 0..1; the total weighs them by how many entries they name.
      let bundleProgress = 0;
      let assetProgress = 0;
      const report = () =>
        onProgress?.((bundleProgress * bundles.length + assetProgress * assets.length) / total);

      await Promise.all([
        bundles.length &&
          Assets.loadBundle([...bundles], (progress) => {
            bundleProgress = progress;
            report();
          }).catch((error: unknown) => {
            console.warn(`[navigation] Failed to load bundles: ${bundles.join(', ')}`, error);
          }),
        assets.length &&
          Assets.load([...assets], (progress) => {
            assetProgress = progress;
            report();
          }).catch((error: unknown) => {
            console.warn(`[navigation] Failed to load assets: ${assets.join(', ')}`, error);
          }),
      ]);
      onProgress?.(1);
    } finally {
      this.loadsInFlight--;
      // A pass skipped while this load ran catches up now.
      if (this.loadsInFlight === 0) void this.release();
    }
  }

  /**
   * Unload everything loaded here that no screen or popup on stage needs, nor the screen
   * reserved by `preload`. Runs after each screen change and closed popup.
   */
  private release(): Promise<void> {
    if (this.loadsInFlight > 0) return this.releasing;

    const live = [this.currentScreen, this.currentPopup, ...this.popupStack, this.background];
    const needed = [
      ...live.flatMap((screen) => (screen ? [this.screenNeeds.get(screen)] : [])),
      ...this.pendingNeeds,
      this.reserved?.needs,
    ];
    const keepBundles = new Set(needed.flatMap((needs) => needs?.bundles ?? []));
    const keepAssets = new Set(needed.flatMap((needs) => needs?.assets ?? []));

    const bundles = [...this.loadedBundles].filter(
      (bundle) => !keepBundles.has(bundle) && !PERSISTENT_BUNDLES.has(bundle),
    );
    const assets = [...this.loadedAssets].filter((asset) => !keepAssets.has(asset));
    if (bundles.length === 0 && assets.length === 0) return this.releasing;

    bundles.forEach((bundle) => this.loadedBundles.delete(bundle));
    assets.forEach((asset) => this.loadedAssets.delete(asset));
    window.__trace?.(`unloading ${[...bundles, ...assets].join(', ')}`);

    this.releasing = this.releasing.then(async () => {
      try {
        await Assets.unload(filesToUnload(bundles, assets));
      } catch (error) {
        console.warn('[navigation] Failed to unload assets', error);
      }
    });
    return this.releasing;
  }

  /**
   * Start loading a screen before showing it, such as a level while its tutorial plays. Its
   * assets stay loaded until it is shown or another screen is, so they are not released in
   * between. `showScreen` then finds them loaded.
   */
  public async preload<P>(
    ctor: AppScreenConstructor<[P]>,
    props: P,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    const reserved: NonNullable<typeof this.reserved> = {
      ctor,
      needs: { bundles: ctor.assetBundles ?? [], assets: [] },
    };
    this.reserved = reserved;
    // Counted as a load from the start, so nothing is released while the assets list is
    // still being worked out, such as a retried level's words.
    this.loadsInFlight++;
    try {
      reserved.needs = await needsOf(ctor, props);
      await this.load(reserved.needs, onProgress);
    } finally {
      this.loadsInFlight--;
      if (this.loadsInFlight === 0) void this.release();
    }
  }

  /** Subscribe to screen changes, announced once the new screen is created. */
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

    // Another screen is shown instead of the one loaded ahead, which is no longer needed.
    if (this.reserved?.ctor !== ctor) this.reserved = undefined;

    // Load assets for the new screen
    this.screenChanges++;
    let needs: AssetNeeds | undefined;
    try {
      needs = await needsOf(ctor, props);
      this.pendingNeeds.add(needs);
      window.__trace?.(`showScreen ${ctor.name}: loading ${needs.bundles.join(', ')}`);
      await this.load(needs, (progress) => this.currentScreen?.onLoad?.(progress * 100));
      window.__trace?.(`showScreen ${ctor.name}: bundles done`);

      // If there is a screen already created, hide and remove it
      if (this.currentScreen) {
        await this.hideAndRemoveScreen(this.currentScreen);
      }

      // Create the new screen and add that to the stage
      this.currentScreen =
        props !== undefined
          ? new (ctor as AppScreenConstructor<[unknown]>)(props)
          : BigPool.get(ctor);
      this.screenNeeds.set(this.currentScreen, needs);
    } finally {
      if (needs) this.pendingNeeds.delete(needs);
      this.screenChanges--;
    }
    if (this.reserved?.ctor === ctor) this.reserved = undefined;

    // Announce before the enter animation so the URL never lags behind what is on screen.
    for (const listener of this.screenChangeListeners) {
      listener(ctor, props);
    }
    // The previous screen is off stage, so what only it used can go.
    void this.release();
    window.__trace?.(`showScreen ${ctor.name}: showing`);
    await this.addAndShowScreen(this.currentScreen);
    window.__trace?.(`showScreen ${ctor.name}: shown`);
  }

  /** Dismiss every popup, nested ones included, and give control back to the screen. */
  public async hideAllPopups() {
    while (this.currentPopup) {
      await this.hidePopup();
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

    // Load assets for the popup. Repeated loads are safe, so assets the screen
    // already has are not fetched again.
    const needs = await needsOf(ctor, props);
    this.pendingNeeds.add(needs);
    try {
      await this.load(needs);

      if (this.currentPopup) {
        await this.hideAndRemoveScreen(this.currentPopup, animate);
      }

      this.currentPopup =
        props !== undefined ? new (ctor as AppScreenConstructor<[unknown]>)(props) : new ctor();
      this.screenNeeds.set(this.currentPopup, needs);
    } finally {
      this.pendingNeeds.delete(needs);
    }
    void this.release();
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

    const needs = await needsOf(ctor, props);
    this.pendingNeeds.add(needs);
    try {
      await this.load(needs);
      this.popupStack.push(parentPopup);
      this.currentPopup =
        props !== undefined ? new (ctor as AppScreenConstructor<[unknown]>)(props) : new ctor();
      this.screenNeeds.set(this.currentPopup, needs);
    } finally {
      this.pendingNeeds.delete(needs);
    }
    await this.addAndShowScreen(this.currentPopup);
  }

  /**
   * Dismiss current popup, if there is one
   */
  public async hidePopup() {
    if (!this.currentPopup) return;
    const popup = this.currentPopup;
    this.currentPopup = undefined;
    // Still on stage while it animates out, so keep what it shows loaded until it is gone.
    const needs = this.screenNeeds.get(popup);
    if (needs) this.pendingNeeds.add(needs);
    try {
      await this.hideAndRemoveScreen(popup);
    } finally {
      if (needs) this.pendingNeeds.delete(needs);
    }
    void this.release();

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
