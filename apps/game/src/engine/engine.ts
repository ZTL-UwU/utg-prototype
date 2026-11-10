import { initDevtools } from '@pixi/devtools';
import '@pixi/layout/devtools';
import { sound } from '@pixi/sound';
import type { ApplicationOptions, DestroyOptions, RendererDestroyOptions } from 'pixi.js';
import 'pixi.js/app';
import { Application, Assets, Container, extensions, ResizePlugin } from 'pixi.js';
import { DEFAULTS as TWEEN_DEFAULTS } from 'tweedle.js';

// @ts-ignore - This is a dynamically generated file by AssetPack
import manifest from '../manifest.json';
import { CreationAudioPlugin } from './audio/AudioPlugin';
import { CreationNavigationPlugin } from './navigation/NavigationPlugin';
import { CreationResizePlugin } from './resize/ResizePlugin';
import { getResolution } from './utils/getResolution';

extensions.remove(ResizePlugin);
extensions.add(CreationResizePlugin);
extensions.add(CreationAudioPlugin);
extensions.add(CreationNavigationPlugin);

// @pixi/ui's FancyButton tweens its innerView on the shared tweedle.js group, which
// every live animated button ticks. destroy() never stops those tweens, so a button
// destroyed mid-animation (e.g. pressed, then its screen or popup is torn down) leaves
// a tween that throws on every frame and starves the tweens queued after it. A failed
// safety check makes tweedle drop the tween instead.
TWEEN_DEFAULTS.safetyCheckFunction = (target) => !(target instanceof Container && target.destroyed);

/**
 * The main creation engine class.
 *
 * This is a lightweight wrapper around the PixiJS Application class.
 * It provides a few additional features such as:
 * - Navigation manager
 * - Audio manager
 * - Resize handling
 * - Visibility change handling (pause/resume sounds)
 *
 * It also initializes the PixiJS application and loads the `preload` bundles.
 */
export class CreationEngine extends Application {
  /** Initialize the application */
  public async init(opts: Partial<ApplicationOptions>): Promise<void> {
    opts.resizeTo ??= window;
    opts.resolution ??= getResolution();
    await super.init(opts);

    // Append the application canvas to the document body
    document.getElementById('pixi-container')!.appendChild(this.canvas);
    // Add a visibility listener, so the app can pause sounds and screens
    document.addEventListener('visibilitychange', this.visibilityChange);

    if (import.meta.env.DEV) {
      // Init PixiJS devtools
      await initDevtools({ app: this });
    }

    window.__trace?.(
      `renderer ready: ${this.renderer.name} ${this.canvas.width}x${this.canvas.height}`,
    );
    // Init PixiJS assets with this asset manifest
    await Assets.init({
      manifest,
      // Absolute URL: Pixi's path utils only find the host of http(s) URLs, so a root-relative
      // basePath under capacitor://localhost resolved to capacitor://assets/... on iOS.
      basePath: new URL(`${import.meta.env.BASE_URL}assets`, window.location.href).href,
    });
    window.__trace?.('Assets.init done; loading preload bundles');
    await Assets.loadBundle(['preload', 'preload-audio']);
    window.__trace?.('preload bundles done');
    // Everything else loads on demand: navigation loads each screen's assets before showing
    // it and unloads them once no screen or popup on stage needs them.
  }

  public override destroy(
    rendererDestroyOptions: RendererDestroyOptions = false,
    options: DestroyOptions = false,
  ): void {
    document.removeEventListener('visibilitychange', this.visibilityChange);
    super.destroy(rendererDestroyOptions, options);
  }

  /** Fire when document visibility changes - lose or regain focus */
  protected visibilityChange = () => {
    // Music streams from an element, which keeps playing through a suspended Web Audio
    // context unless paused itself.
    this.audio.bgm.setHidden(document.hidden);
    if (document.hidden) {
      sound.pauseAll();
      this.navigation.blur();
    } else {
      sound.resumeAll();
      this.navigation.focus();
    }
  };
}
