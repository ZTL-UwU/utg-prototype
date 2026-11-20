import { animate, type AnimationPlaybackControls } from 'motion';
import type { Container } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { LevelLoadingScreen } from '../level-loading';
import type { TLevel, TMapUnit } from './units';

type LevelStopOptions = {
  level: TLevel;
  mapUnit: TMapUnit;
  /** True while the map is being dragged, so the press scrolls instead of opening. */
  isDragging: () => boolean;
  hoverScale: number;
};

/**
 * Make a map stop open its level on tap, once, and grow while hovered. Levels without a screen
 * have nothing to play, so they stay dimmed and inert. Returns what `destroy` should stop.
 */
export function makeLevelStop(
  target: Container,
  { level, mapUnit, isDragging, hoverScale }: LevelStopOptions,
): () => void {
  if (!level.screen) {
    target.alpha = 0.5;
    return () => {};
  }

  target.eventMode = 'static';
  target.cursor = 'pointer';
  let opening = false;
  target.on('pointertap', () => {
    if (opening || isDragging()) return;
    opening = true;
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
    void engine().navigation.showScreen(LevelLoadingScreen, { level, mapUnit });
  });

  let hover: AnimationPlaybackControls | undefined;
  const scaleTo = (scale: number) => {
    hover?.stop();
    hover = animate(target.scale, { x: scale, y: scale }, { duration: 0.15 });
  };
  target.on('pointerover', () => scaleTo(hoverScale));
  target.on('pointerout', () => scaleTo(1));
  return () => hover?.stop();
}
