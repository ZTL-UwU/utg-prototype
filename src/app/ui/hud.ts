import { Container } from 'pixi.js';

import { BackButton } from './back-button';
import { HelpButton } from './help-button';

interface HUDProps {
  onBack: () => void;
  onHelp?: () => void;
}

export class HUD extends Container {
  constructor({ onBack, onHelp }: HUDProps) {
    super({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    });

    this.addChild(new BackButton(onBack), new HelpButton({ onHelp }));
  }
}
