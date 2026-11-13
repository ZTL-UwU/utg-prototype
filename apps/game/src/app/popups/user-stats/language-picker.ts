import { FancyButton } from '@pixi/ui';
import { Container, Graphics, Text } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive } from '../../../engine/utils/viewport';
import { m } from '../../../paraglide/messages.js';
import { getLocale, locales, setLocale, type Locale } from '../../../paraglide/runtime.js';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';

/** Each language in its own words, so a player who can't read the current one still finds theirs. */
const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
};

const BUTTON_WIDTH = 150;
const BUTTON_HEIGHT = 56;
const BUTTON_RADIUS = 18;
const RIM_COLOR = 0xd89456;
const FACE_COLOR = 0xfdf7e7;

function createLocaleButton(locale: Locale, selected: boolean) {
  const view = new Graphics().roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS);
  if (selected) {
    view.fill(RIM_COLOR);
  } else {
    view.fill(FACE_COLOR).stroke({ color: RIM_COLOR, width: 3, alignment: 1 });
  }

  const button = new FancyButton({
    defaultView: view,
    text: new Text({
      text: LOCALE_NAMES[locale],
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: 28,
        fontWeight: 'bold',
        fill: selected ? FACE_COLOR : RIM_COLOR,
      },
    }),
    animations: selected
      ? undefined
      : {
          hover: { props: { scale: { x: 1.05, y: 1.05 } }, duration: 100 },
          pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
        },
    anchor: 0.5,
  });
  button.layout = { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, isLeaf: true };

  if (!selected) {
    button.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      // Reloads the page: every Pixi text is built once with the locale it started in, and the
      // router rebuilds the current screen from the URL.
      void setLocale(locale);
    });
  }

  return button;
}

/** A "Language" caption and one button per game language; the current one is filled in. */
export function createLanguagePicker() {
  const current = getLocale();
  const buttons = new Container({
    layout: { flexDirection: 'row', gap: 12 },
    children: locales.map((locale) => createLocaleButton(locale, locale === current)),
  });
  return new Container({
    layout: {
      // Beside the buttons in the wide header; stacked above them in the narrow phone corner.
      flexDirection: responsive<'row' | 'column'>({ sm: 'column', lg: 'row' }),
      alignItems: responsive<'center' | 'flex-end'>({ sm: 'flex-end', lg: 'center' }),
      gap: 12,
    },
    children: [
      new Text({
        text: m.language(),
        style: { fontFamily: DISPLAY_FONT_FAMILY, fontSize: 28, fill: 0x808080 },
        layout: true,
      }),
      buttons,
    ],
  });
}
