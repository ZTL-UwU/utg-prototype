import type { TextOptions, TextStyleOptions } from 'pixi.js';
import { Text, TextStyle } from 'pixi.js';

const defaultLabelStyle: Partial<TextStyleOptions> = {
  fontFamily: 'Arial Rounded MT Bold',
  align: 'center',
};

export type LabelOptions = typeof defaultLabelStyle;

/**
 * A Text extension pre-formatted for this app, starting centred by default,
 * because it is the most common use in the app.
 */
export class Label extends Text {
  constructor(opts?: TextOptions) {
    const { style: styleOpt, ...restOpts } = opts ?? {};
    const style: Partial<TextStyleOptions> = { ...defaultLabelStyle };
    if (styleOpt instanceof TextStyle) {
      Object.assign(style, styleOpt);
    } else if (styleOpt) {
      Object.assign(style, styleOpt);
    }
    super({ ...restOpts, style });
    // Label is always centred, but this can be changed in instance afterwards
    this.anchor.set(0.5);
  }
}
