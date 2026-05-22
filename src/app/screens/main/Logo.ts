import { Sprite, Texture } from 'pixi.js';

import { randomBool, randomFloat, randomInt } from '../../../engine/utils/random';

export const DIRECTION = {
  NE: 0,
  NW: 1,
  SE: 2,
  SW: 3,
} as const;

export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];

export class Logo extends Sprite {
  public direction!: Direction;
  public speed!: number;

  get left() {
    return -this.width * 0.5;
  }

  get right() {
    return this.width * 0.5;
  }

  get top() {
    return -this.height * 0.5;
  }

  get bottom() {
    return this.height * 0.5;
  }

  constructor() {
    const tex = randomBool() ? 'logo.svg' : 'logo-white.svg';
    super({ texture: Texture.from(tex), anchor: 0.5, scale: 0.25 });
    this.direction = [DIRECTION.NE, DIRECTION.NW, DIRECTION.SE, DIRECTION.SW][randomInt(0, 3)]!;
    this.speed = randomFloat(1, 6);
  }
}
