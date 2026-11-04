import type { Container, Filter } from 'pixi.js';

/**
 * Detach `filter` from `target`, leaving any other filters in place. Popups use this
 * to drop the blur they put on the screen: a BlurFilter animated to strength 0 still
 * renders the whole screen through an offscreen pass, which leaves it soft or garbled.
 */
export function removeFilter(target: Container, filter: Filter) {
  const filters = target.filters;
  if (!filters) return;
  const list = Array.isArray(filters) ? filters : [filters];
  if (!list.includes(filter)) return;
  target.filters = list.filter((f) => f !== filter);
}
