import { Container, Graphics, Text, TextStyle } from 'pixi.js';

import { m } from '../../../../paraglide/messages.js';

const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 120;
const BG_COLOR = 0xfde2e2;
const BORDER_COLOR = 0xe57373;
const TEXT_COLOR = 0xb71c1c;

/**
 * Shown in place of a letter's example word when the word catalog has no tutorial word for it,
 * either because the catalog failed to load or because none was authored. Either way it's a
 * content error, so the console gets the letter.
 */
export class MissingWordError extends Container {
  constructor(letter: string) {
    console.error(`[letter-popup] No tutorial word for letter "${letter}"`);

    // Outer: fills the popup, centers its child via flex
    super({
      layout: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      },
    });

    // Inner: the tinted panel itself, with explicit dimensions
    // so the flex parent knows what it's centering
    const panel = new Container({
      layout: {
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
      },
    });

    const bg = new Graphics()
      .roundRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 16)
      .fill(BG_COLOR)
      .stroke({ color: BORDER_COLOR, width: 2, alpha: 0.6 });
    panel.addChild(bg);

    const message = new Text({
      text: m.education_example_missing(),
      style: new TextStyle({
        fontFamily: 'sans-serif',
        fontSize: 24,
        fontWeight: '600',
        fill: TEXT_COLOR,
        align: 'center',
      }),
    });
    message.x = Math.round((PANEL_WIDTH - message.width) / 2);
    message.y = Math.round((PANEL_HEIGHT - message.height) / 2);
    panel.addChild(message);

    this.addChild(panel);
  }
}
