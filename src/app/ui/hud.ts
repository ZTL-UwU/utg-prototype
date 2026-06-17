import { Container } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import { TutorialPopup } from '../popups/tutorial';
import { BackButton } from './back-button';
import { HelpButton } from './help-button';

interface HUDProps {
  onBack: () => void;
  onHelp?: () => void;
  toTutorial?: boolean;
  helpAsset?: string;
  backdropColor?: number;
  noHelpButton?: boolean;
}

export class HUD extends Container {
  constructor({
    onBack,
    onHelp,
    toTutorial,
    helpAsset,
    backdropColor = 0,
    noHelpButton = false,
  }: HUDProps) {
    super({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    });

    const helpCallback =
      onHelp ??
      (helpAsset
        ? () =>
            void engine().navigation.showPopup(TutorialPopup, {
              asset: helpAsset,
              backdropColor,
              exitable: true,
            })
        : undefined);

    if (!noHelpButton) {
      this.addChild(new BackButton(onBack), new HelpButton({ onHelp: helpCallback, toTutorial }));
    } else {
      this.addChild(new BackButton(onBack));
    }
  }
}
