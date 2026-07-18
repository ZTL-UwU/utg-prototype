import { CanvasTextMetrics, Container, Text, TextStyle, type TextStyleOptions } from 'pixi.js';

export type CurvedTextOptions = {
  text: string;
  style: TextStyleOptions;
  /** Radius of the arc the text follows. Smaller values curve more strongly. */
  radius?: number;
  /** Maximum arc angle in radians, so long titles don't curve too deeply. */
  maxAngle?: number;
};

/**
 * Renders text along an upward arc (rainbow shape) by placing each character
 * as its own Text object, rotated tangent to a circle of the given radius.
 */
export class CurvedText extends Container {
  constructor({ text, style, radius = 1200, maxAngle = 0.7 }: CurvedTextOptions) {
    super();

    const textStyle = new TextStyle(style);
    const chars = Array.from(new Intl.Segmenter().segment(text), (segment) => segment.segment);
    const widths = chars.map((char) => CanvasTextMetrics.measureText(char, textStyle).width);
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    const totalAngle = Math.min(totalWidth / radius, maxAngle);
    radius = totalWidth / totalAngle;

    let distance = 0;
    for (let i = 0; i < chars.length; i++) {
      const angle = (distance + widths[i] / 2) / radius - totalAngle / 2;
      distance += widths[i];

      if (chars[i].trim() === '') continue;

      const charText = new Text({ text: chars[i], style: textStyle, anchor: 0.5 });
      charText.rotation = angle;
      charText.position.set(Math.sin(angle) * radius, radius - Math.cos(angle) * radius);
      this.addChild(charText);
    }

    // Shift characters so the container's local bounds start at (0, 0),
    // which keeps it well-behaved inside layout containers.
    const bounds = this.getLocalBounds();
    for (const child of this.children) {
      child.x -= bounds.x;
      child.y -= bounds.y;
    }
  }
}
