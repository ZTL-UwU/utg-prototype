import type { FancyButton } from '@pixi/ui';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive } from '../../../engine/utils/viewport';
import { m } from '../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import useCourseStore from '../../../zustandStores/courseStore';
import { BACKDROP_TEXT_SHADOW, createPrimaryButton } from '../../ui/primary-button';

/** Side margin the message wraps inside of. */
const MESSAGE_SIDE_MARGIN = 60;
const MESSAGE_MAX_WIDTH = 900;

/** The store's error is developer text, so players get the hint and the console the detail. */
function reportLoadError() {
  const { error } = useCourseStore.getState();
  if (error) console.warn('[course] Failed to load the course catalog:', error);
}

/** Shown when the course catalog fails to load from the backend. */
export class CourseLoadErrorScreen extends Container {
  public readonly screenName = 'CourseLoadErrorScreen';
  public static assetBundles = ['home'];

  private background: Sprite;
  private title: Text;
  private message: Text;
  private retryButton: FancyButton;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
      },
    });

    this.background = new Sprite({
      texture: Texture.from('home/background.png'),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.title = new Text({
      text: m.course_load_failed(),
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fontWeight: '700',
        fill: 0xffffff,
        dropShadow: BACKDROP_TEXT_SHADOW,
      },
      layout: true,
    });

    reportLoadError();
    this.message = new Text({
      text: m.course_load_hint(),
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fill: 0xffffff,
        align: 'center',
        wordWrap: true,
        dropShadow: BACKDROP_TEXT_SHADOW,
      },
      layout: true,
    });

    this.retryButton = createPrimaryButton({
      text: m.retry(),
      width: 360,
      height: 140,
      fontSize: 56,
      radius: 36,
      shadowOffset: 12,
      hoverScale: 1.05,
      pressedScale: 0.95,
    });
    this.retryButton.onPress.connect(() => {
      void this.handleRetry();
    });

    this.addChild(this.background, this.title, this.message, this.retryButton);
  }

  private async handleRetry() {
    if (!this.retryButton.enabled) return;
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
    this.retryButton.enabled = false;
    this.message.text = m.loading();

    await useCourseStore.getState().fetchCourseStructure();

    if (useCourseStore.getState().status === 'ready') {
      // The address bar still holds the URL that needed the catalog; open it for real now.
      const { router } = await import('../../../router');
      await router.reload();
      return;
    }

    if (this.destroyed) return;
    reportLoadError();
    this.message.text = m.course_load_hint();
    this.retryButton.enabled = true;
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.title.style.fontSize = responsive({ sm: 56, lg: 72 });
    this.message.style.fontSize = responsive({ sm: 32, lg: 36 });
    this.message.style.wordWrapWidth = Math.min(MESSAGE_MAX_WIDTH, width - 2 * MESSAGE_SIDE_MARGIN);
  }
}
