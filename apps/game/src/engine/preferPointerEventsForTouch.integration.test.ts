import { FancyButton } from '@pixi/ui';
import { Graphics, isMobile } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { preferPointerEventsForTouch } from './preferPointerEventsForTouch';

describe('FancyButton event binding after UA spoof', () => {
  const originalAny = isMobile.any;

  afterEach(() => {
    isMobile.any = originalAny;
  });

  it('listens for pointertap instead of click on a desktop UA with touch', () => {
    isMobile.any = false;
    preferPointerEventsForTouch(isMobile, true);

    const button = new FancyButton({
      defaultView: new Graphics().rect(0, 0, 80, 40).fill(0xff914d),
    });

    expect(button.listenerCount('pointertap')).toBeGreaterThan(0);
    expect(button.listenerCount('click')).toBe(0);

    button.destroy();
  });

  it('keeps mouse click listeners on a mouse-only desktop', () => {
    isMobile.any = false;
    preferPointerEventsForTouch(isMobile, false);

    const button = new FancyButton({
      defaultView: new Graphics().rect(0, 0, 80, 40).fill(0xff914d),
    });

    expect(button.listenerCount('click')).toBeGreaterThan(0);
    expect(button.listenerCount('pointertap')).toBe(0);

    button.destroy();
  });
});
