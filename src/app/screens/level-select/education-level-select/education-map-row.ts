import { Container, Graphics } from 'pixi.js';

import { educationMaps } from '../../level-map/units';
import { MapUnitButton } from './map-unit-button';

export class EducationMapRow extends Container {
  constructor() {
    super({
      layout: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
      },
    });

    const children = educationMaps.flatMap((mapUnit, i) => {
      const fillerLine = new Graphics({ layout: { width: 100, height: 15 } })
        .roundRect(0, 0, 100, 15, 10)
        .fill(0xa66129);
      const button = new MapUnitButton(mapUnit, i);

      return i === 0 ? [button] : [fillerLine, button];
    });

    this.addChild(...children);
  }
}
