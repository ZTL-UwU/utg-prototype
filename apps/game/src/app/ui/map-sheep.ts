import { animate, type AnimationPlaybackControls } from 'motion';
import { Assets, Sprite, Texture } from 'pixi.js';

/** Swap for the maps' own sheep art when it lands; the sheep mascot stands in until then. */
const SHEEP_ALIAS = 'education-levels/education-level-map/sheep.png';
const SHEEP_FALLBACK_ALIAS = 'mascots/sheep/default.png';
/** Bundles a screen showing the map sheep must load. */
export const MAP_SHEEP_BUNDLES = ['education-level-map', 'mascots'];

const HOP_DURATION = 0.6;

/** The sheep that stands on the current stop of a map, feet at its anchor. */
export function createMapSheep(): Sprite {
  const alias = Assets.cache.has(SHEEP_ALIAS) ? SHEEP_ALIAS : SHEEP_FALLBACK_ALIAS;
  return new Sprite({ texture: Texture.from(alias), anchor: { x: 0.5, y: 1 } });
}

/**
 * Hops a sheep in one arc between two points in its parent's space, facing the way it
 * travels (the art faces right). `scale` is the sheep's unflipped scale.
 */
export function hopSheep(
  sheep: Sprite,
  from: { x: number; y: number },
  to: { x: number; y: number },
  scale: number,
): AnimationPlaybackControls {
  const arc = 140 + Math.abs(to.x - from.x) * 0.15 + Math.max(0, from.y - to.y) * 0.3;
  sheep.scale.set((to.x < from.x ? -1 : 1) * scale, scale);
  return animate(0, 1, {
    duration: HOP_DURATION,
    ease: 'easeInOut',
    onUpdate: (p) => {
      if (sheep.destroyed) return;
      sheep.x = from.x + (to.x - from.x) * p;
      sheep.y = from.y + (to.y - from.y) * p - arc * 4 * p * (1 - p);
    },
  });
}
