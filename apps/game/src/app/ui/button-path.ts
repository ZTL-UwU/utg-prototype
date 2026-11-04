import { animate } from 'motion';
import { Graphics, type Container } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import { responsive } from '../../engine/utils/viewport';

/**
 * Map screens show their buttons as a path joined by short lines: a row across the middle of
 * wide screens, rising from below, and on phones a centered column, sliding in from the right.
 */

/** Level, map and tutorial buttons are all this size. */
export const PATH_BUTTON_SIZE = 221;
const GAP = 8;
const LINE_THICKNESS = 15;
/** Phones use shorter lines so more buttons fit in the column. */
const PHONE_LINE_LENGTH = 50;
const PHONE_MAX_SCALE = 0.77;
/** Room kept clear above the centered column for the title and subtitle, and the same below. */
const PHONE_TITLE_SPACE = 460;
/** Extra margin so drop shadows don't peek in from the screen edge. */
const OFF_SCREEN_MARGIN = 40;

/** Phones are too narrow for a row of buttons, so they stack them in a column. */
export function isPathVertical() {
  return responsive({ sm: true, lg: false });
}

/** Where the path sits: in the screen's centered column on phones, pinned at mid-height otherwise. */
export function pathPosition() {
  return responsive({ sm: {}, lg: { position: 'absolute' as const, top: '50%' as const } });
}

/** Flex layout that lines buttons up along the path. */
export function pathFlex(vertical: boolean) {
  return {
    width: '100%' as const,
    flexDirection: vertical ? ('column' as const) : ('row' as const),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: GAP,
  };
}

/** The buttons with a connecting line between each pair. */
export function joinWithLines(buttons: Container[], vertical: boolean): Container[] {
  const createLine = () =>
    vertical
      ? new Graphics({ layout: { width: LINE_THICKNESS, height: PHONE_LINE_LENGTH } })
          .roundRect(0, 0, LINE_THICKNESS, PHONE_LINE_LENGTH, 10)
          .fill(0xa66129)
      : new Graphics({ layout: { width: 80, height: LINE_THICKNESS } })
          .roundRect(0, 0, 100, LINE_THICKNESS, 10)
          .fill(0xa66129);

  return buttons.flatMap((button, i) => (i === 0 ? [button] : [createLine(), button]));
}

/**
 * Sizes a full-width path. Phones draw the buttons smaller, shrinking further when a column of
 * `buttonCount` would overflow. Scaling happens around the layout box's center, so it stays centered.
 */
export function resizePath(path: Container, buttonCount: number, width: number, height: number) {
  const columnHeight =
    buttonCount * PATH_BUTTON_SIZE + Math.max(buttonCount - 1, 0) * (PHONE_LINE_LENGTH + 2 * GAP);
  const scale = responsive({
    sm: Math.min(PHONE_MAX_SCALE, (height - 2 * PHONE_TITLE_SPACE) / columnHeight),
    lg: 1,
  });
  path.scale.set(scale);
  path.layout = { width: width / scale };
}

/** The local offset that moves a child fully past the far screen edge along the path's axis. */
function offScreenOffset(path: Container, child: Container, vertical: boolean) {
  const { width, height } = engine().navigation;
  const { x, y } = child.getGlobalPosition();
  const distance = vertical ? width - x + PATH_BUTTON_SIZE : height - y;
  // Offsets are in the path's own units, which the phone scale shrinks.
  return (distance + OFF_SCREEN_MARGIN) / path.scale.x;
}

export async function playPathEnter(path: Container, children: Container[], vertical: boolean) {
  const axis = vertical ? 'x' : 'y';
  for (const child of children) {
    child[axis] = 0;
    child[axis] = offScreenOffset(path, child, vertical);
  }

  await Promise.all(
    children.map((child, index) =>
      animate(child, { [axis]: 0 }, { duration: 0.4, ease: 'backOut', delay: index * 0.07 }),
    ),
  );
}

export async function playPathExit(path: Container, children: Container[], vertical: boolean) {
  const axis = vertical ? 'x' : 'y';
  await Promise.all(
    children.map((child, index) =>
      animate(
        child,
        { [axis]: offScreenOffset(path, child, vertical) },
        { duration: 0.2, ease: 'backIn', delay: index * 0.02 },
      ),
    ),
  );
}
