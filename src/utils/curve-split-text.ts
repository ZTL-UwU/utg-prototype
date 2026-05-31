import { Point, SplitText } from 'pixi.js';

const tempPoint = new Point();

/** Positions each character of a SplitText along an upward arc. */
export function curveSplitText(splitText: SplitText, radius: number) {
  const { chars } = splitText;
  if (chars.length === 0) return;

  const linearPositions = chars.map((char) => {
    const global = char.getGlobalPosition(tempPoint);
    return splitText.toLocal(global);
  });

  const minX = Math.min(...linearPositions.map((point) => point.x));
  const maxX = Math.max(...linearPositions.map((point) => point.x));
  const totalWidth = maxX - minX;
  const baseY = linearPositions.reduce((sum, point) => sum + point.y, 0) / linearPositions.length;
  const centerX = (minX + maxX) / 2;
  const arcAngle = totalWidth / radius;

  splitText.removeChildren();
  splitText.lines.length = 0;
  splitText.words.length = 0;

  chars.forEach((char, index) => {
    splitText.addChild(char);

    const progress = totalWidth > 0 ? (linearPositions[index].x - minX) / totalWidth : 0.5;
    const angle = (progress - 0.5) * arcAngle;

    char.x = centerX + radius * Math.sin(angle);
    char.y = baseY + radius * (1 - Math.cos(angle));
    char.rotation = angle;
  });

  const bounds = splitText.getLocalBounds();
  for (const char of chars) {
    char.x -= bounds.x;
    char.y -= bounds.y;
  }

  splitText.layout?.forceUpdate();
}
