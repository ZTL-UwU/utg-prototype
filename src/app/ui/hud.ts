import { Container } from 'pixi.js';

import { BackButton } from './back-button';
import { EndButton } from './end-button';
import { HelpButton } from './help-button';

interface HUDProps {
  onBack: () => void;
  onEnd?: () => void;
}

export class HUD extends Container {
  constructor({ onBack, onEnd }: HUDProps) {
    super({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    });

    this.addChild(new BackButton(onBack), new HelpButton());

    if (onEnd) {
      this.addChild(new EndButton(onEnd));
    }
  }
}
