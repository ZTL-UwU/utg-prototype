import '@pixi/layout';
import { initDevtools } from '@pixi/devtools';
import { Application, Assets, Container } from 'pixi.js';
import type { Ticker } from 'pixi.js';

import type { Scene, SceneConstructor } from './scenes/types';

export type { Scene, SceneConstructor, SceneLifecycle } from './scenes/types';

export class SceneManager {
  private static initQueue = Promise.resolve();

  public readonly app = new Application();
  public readonly sceneLayer = new Container();
  public readonly overlayLayer = new Container();

  public width = 0;
  public height = 0;

  private readonly registeredScenes = new Map<string, SceneConstructor>();
  private readonly updateHandlers = new WeakMap<Scene, (ticker: Ticker) => void>();
  private currentScene?: Scene;
  private currentOverlay?: Scene;
  private initialized = false;
  private readonly registeredBundles = new Set<string>();
  private destroyed = false;
  private initPromise?: Promise<void>;

  private readonly resizeHandler = () => this.syncLayout();
  private readonly visibilityHandler = () => this.handleVisibilityChange();

  public async init(host: HTMLElement) {
    if (this.initialized || this.destroyed) return;

    this.initPromise ??= this.enqueueInit(host);
    await this.initPromise;
  }

  private async initApplication(host: HTMLElement) {
    if (this.initialized || this.destroyed) return;

    await this.app.init({
      antialias: true,
      autoDensity: true,
      resolution: Math.max(window.devicePixelRatio || 1, 1),
      resizeTo: host,
    });

    if (this.destroyed) {
      this.disposeApp();
      return;
    }

    await initDevtools({ app: this.app });

    this.app.stage.layout = {
      width: this.app.renderer.width,
      height: this.app.renderer.height,
    };
    this.sceneLayer.layout = {
      position: 'absolute',
      width: window.innerWidth,
      height: window.innerHeight,
    };
    this.overlayLayer.layout = {
      position: 'absolute',
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.app.stage.addChild(this.sceneLayer, this.overlayLayer);
    host.appendChild(this.app.canvas);

    if (this.destroyed) {
      this.disposeApp();
      return;
    }

    this.app.renderer.on('resize', this.resizeHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.initialized = true;
    this.syncLayout();
  }

  public register(...constructors: SceneConstructor[]) {
    for (const Ctor of constructors) {
      const registered = this.registeredScenes.get(Ctor.sceneId);
      if (registered && registered !== Ctor) {
        throw new Error(`[SceneManager] Duplicate scene id: ${Ctor.sceneId}`);
      }

      this.registeredScenes.set(Ctor.sceneId, Ctor);
      this.registerSceneBundles(Ctor);
    }

    return this;
  }

  public async goTo<TData>(Ctor: SceneConstructor<TData>, data?: TData) {
    this.ensureInitialized();
    this.register(Ctor);

    if (this.currentScene) {
      this.currentScene.interactiveChildren = false;
    }

    await this.loadSceneAssets(Ctor);
    if (this.destroyed) return;

    if (this.currentScene) {
      await this.hideAndRemoveScene(this.currentScene, this.sceneLayer);
    }
    if (this.destroyed) return;

    this.currentScene = this.createScene(Ctor);
    await this.addAndShowScene(this.currentScene, this.sceneLayer, data);
  }

  public async showOverlay<TData>(Ctor: SceneConstructor<TData>, data?: TData) {
    this.ensureInitialized();
    this.register(Ctor);

    if (this.currentScene) {
      this.currentScene.interactiveChildren = false;
      await this.currentScene.pause?.();
    }

    if (this.currentOverlay) {
      await this.hideAndRemoveScene(this.currentOverlay, this.overlayLayer);
    }

    await this.loadSceneAssets(Ctor);
    if (this.destroyed) return;

    this.currentOverlay = this.createScene(Ctor);
    await this.addAndShowScene(this.currentOverlay, this.overlayLayer, data);
  }

  public async hideOverlay() {
    if (!this.currentOverlay) return;

    const overlay = this.currentOverlay;
    this.currentOverlay = undefined;
    await this.hideAndRemoveScene(overlay, this.overlayLayer);

    if (this.currentScene) {
      this.currentScene.interactiveChildren = true;
      await this.currentScene.resume?.();
    }
  }

  public syncLayout() {
    if (!this.initialized || !this.app.renderer) return;

    const { width, height } = this.app.renderer;
    this.width = width;
    this.height = height;
    this.app.stage.layout = {
      width,
      height,
    };
    this.sceneLayer.layout = {
      width,
      height,
    };
    this.overlayLayer.layout = {
      width,
      height,
    };

    this.app.renderer.layout?.update(this.app.stage);

    this.currentScene?.resize?.(width, height);
    this.currentOverlay?.resize?.(width, height);
  }

  public destroy() {
    if (this.destroyed) return;

    this.destroyed = true;
    this.app.renderer?.off('resize', this.resizeHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);

    for (const scene of [this.currentScene, this.currentOverlay]) {
      if (!scene) continue;
      this.unwireScene(scene);
      this.disposeScene(scene);
    }

    this.registeredScenes.clear();
    this.registeredBundles.clear();
    this.currentScene = undefined;
    this.currentOverlay = undefined;

    this.disposeApp();
  }

  private async addAndShowScene<TData>(scene: Scene<TData>, layer: Container, data?: TData) {
    await scene.prepare?.(data);
    if (this.destroyed) return;

    layer.addChild(scene);
    this.syncLayout();

    if (scene.onTick) {
      const onTick = (ticker: Ticker) => scene.onTick?.(ticker);
      this.updateHandlers.set(scene, onTick);
      this.app.ticker.add(onTick);
    }

    scene.interactiveChildren = false;
    await scene.show?.();
    scene.interactiveChildren = true;
  }

  private async hideAndRemoveScene(scene: Scene, layer: Container) {
    scene.interactiveChildren = false;
    await scene.hide?.();
    this.unwireScene(scene);

    if (scene.parent === layer) {
      layer.removeChild(scene);
    } else if (scene.parent) {
      scene.parent.removeChild(scene);
    }

    scene.reset?.();
    this.disposeScene(scene);
  }

  private createScene<TData>(Ctor: SceneConstructor<TData>) {
    const registered = this.registeredScenes.get(Ctor.sceneId);
    if (!registered) {
      throw new Error(`[SceneManager] Scene is not registered: ${Ctor.sceneId}`);
    }

    return new registered() as Scene<TData>;
  }

  private enqueueInit(host: HTMLElement) {
    const init = SceneManager.initQueue.then(() => this.initApplication(host));
    SceneManager.initQueue = init.catch(() => undefined);

    return init.finally(() => {
      this.initPromise = undefined;
    });
  }

  private disposeScene(scene: Scene) {
    if (scene.parent) {
      scene.parent.removeChild(scene);
    }

    scene.layout = null;
    scene.destroy({ children: true });
  }

  private registerSceneBundles(Ctor: SceneConstructor) {
    for (const bundle of Ctor.assetBundles ?? []) {
      if (this.registeredBundles.has(bundle.name)) continue;

      Assets.addBundle(bundle.name, bundle.assets);
      this.registeredBundles.add(bundle.name);
    }
  }

  private async loadSceneAssets(Ctor: SceneConstructor) {
    const bundleNames = Ctor.assetBundles?.map((bundle) => bundle.name);
    if (!bundleNames?.length) return;

    await Assets.loadBundle(bundleNames);
  }

  private unwireScene(scene: Scene) {
    if (!this.app.renderer) return;

    const update = this.updateHandlers.get(scene);
    if (update) {
      this.app.ticker.remove(update);
      this.updateHandlers.delete(scene);
    }
  }

  private disposeApp() {
    if (!this.app.renderer) {
      this.initialized = false;
      return;
    }

    this.app.canvas.remove();
    this.app.destroy(true, { children: true });
    this.initialized = false;
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.currentScene?.blur?.();
      this.currentOverlay?.blur?.();
      return;
    }

    this.currentScene?.focus?.();
    this.currentOverlay?.focus?.();
  }

  private ensureInitialized() {
    if (!this.initialized || this.destroyed) {
      throw new Error('[SceneManager] Manager must be initialized before use.');
    }
  }
}
