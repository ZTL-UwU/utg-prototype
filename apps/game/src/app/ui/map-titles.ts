import type { Container } from 'pixi.js';

import { responsive, topClearance } from '../../engine/utils/viewport';

/** Phones drop the titles below the back button and script pill, which would cover them. */
const TITLE_TOP = { sm: 170, lg: 100 };
const SUBTITLE_TOP = { sm: 310, lg: 300 };
/** Space kept on each side of a title that is shrunk to fit a narrow screen. */
const TITLE_SIDE_MARGIN = 40;
/** Extra margin so drop shadows don't peek in from the screen edge. */
const OFF_SCREEN_MARGIN = 40;

/**
 * Where a map screen's title and subtitle sit from the top of the view. Reads the window, so
 * call it in `resize`.
 */
export function mapTitleTops(viewHeight: number) {
  const clearance = topClearance(viewHeight);
  return {
    title: responsive(TITLE_TOP) + clearance,
    subtitle: responsive(SUBTITLE_TOP) + clearance,
  };
}

/** Scale that fits a title `titleWidth` wide (unscaled) across the view, never growing it. */
export function fitTitleScale(viewWidth: number, titleWidth: number) {
  return Math.min(1, (viewWidth - 2 * TITLE_SIDE_MARGIN) / titleWidth);
}

/** The y offset that moves an element laid out at `layoutTop` fully above the top screen edge. */
export function offScreenY(element: Container, layoutTop: number) {
  return -(layoutTop + element.getLocalBounds().maxY * element.scale.y + OFF_SCREEN_MARGIN);
}
