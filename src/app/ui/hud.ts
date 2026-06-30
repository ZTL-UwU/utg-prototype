import { Container } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import { TutorialPopup } from '../popups/tutorial';
import { EducationTutorialScreen } from '../screens/education-level/level-tutorial';
import type { TMapUnit } from '../screens/level-map/units';
import { TypingTutorialScreen } from '../screens/typing-level/level-tutorial';
import { BackButton } from './back-button';
import { HelpButton } from './help-button';

interface HUDProps {
  onBack: () => void;
  toTutorial?: boolean;
  mapUnit?: TMapUnit;
  helpAsset?: string;
  backdropColor?: number;
  noHelpButton?: boolean;
}

export class HUD extends Container {
  constructor({
    onBack,
    toTutorial,
    mapUnit,
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
      toTutorial && mapUnit
        ? () =>
            void engine().navigation.showScreen(
              mapUnit.type === 'education' ? EducationTutorialScreen : TypingTutorialScreen,
              mapUnit,
            )
        : helpAsset
          ? () =>
              void engine().navigation.showPopup(TutorialPopup, {
                asset: helpAsset,
                backdropColor,
                isFullscreen: false,
              })
          : undefined;

    if (!noHelpButton) {
      this.addChild(new BackButton(onBack), new HelpButton({ onPress: helpCallback, toTutorial }));
    } else {
      this.addChild(new BackButton(onBack));
    }
  }
}
