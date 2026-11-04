import type { Container } from 'pixi.js';

/**
 * Size a full-screen popup to the view, drawn `scale` times its authored size. Layout runs in
 * unscaled units; origin 0 scales from the top-left so the popup still fills the view and its
 * flex centering holds.
 */
export function layoutPopup(popup: Container, width: number, height: number, scale: number) {
  popup.scale.set(scale);
  popup.layout = { width: width / scale, height: height / scale, transformOrigin: 0 };
}
