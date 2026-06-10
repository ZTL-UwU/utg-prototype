import { Container } from 'pixi.js';

import { BackButton } from './back-button';
import { HelpButton } from './help-button';

interface HUDProps {
  onBack: () => void;
  toTutorial: boolean;
  helpAsset?: string;
  backdropColor?: number;
}

export class HUD extends Container {
  constructor({ onBack, toTutorial, helpAsset, backdropColor }: HUDProps) {
    super({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    });

    this.addChild(new BackButton(onBack), new HelpButton({ toTutorial, helpAsset, backdropColor }));
  }
}
