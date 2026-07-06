import { Container } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import { TutorialPopup } from '../popups/tutorial';
import {
  EducationTutorialPopup,
  EducationTutorialScreen,
} from '../screens/education-level/level-tutorial';
import type { TMapUnit } from '../screens/level-map/units';
import { TypingTutorialPopup, TypingTutorialScreen } from '../screens/typing-level/level-tutorial';
import { BackButton } from './back-button';
import { HelpButton } from './help-button';

export type THudHelp =
  | { kind: 'tutorial'; mapUnit: TMapUnit; presentation: 'popup' | 'screen' }
  | { kind: 'image'; asset: string; backdropColor: number };

interface HUDProps {
  onBack: () => void;
  help?: THudHelp;
}

export class HUD extends Container {
  constructor({ onBack, help }: HUDProps) {
    super({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    });

    this.addChild(new BackButton(onBack));

    const onHelp = help && createHelpAction(help);
    if (onHelp) {
      this.addChild(new HelpButton({ onPress: onHelp, icon: help.kind }));
    }
  }
}

function createHelpAction(help: THudHelp): (() => void) | undefined {
  if (help.kind === 'image') {
    return () =>
      void engine().navigation.showPopup(TutorialPopup, {
        asset: help.asset,
        backdropColor: help.backdropColor,
        isFullscreen: false,
      });
  }

  const { mapUnit, presentation } = help;
  switch (mapUnit.type) {
    case 'education':
      return presentation === 'screen'
        ? () => void engine().navigation.showScreen(EducationTutorialScreen, mapUnit)
        : () => void engine().navigation.showPopup(EducationTutorialPopup, mapUnit);
    case 'typing':
      return presentation === 'screen'
        ? () => void engine().navigation.showScreen(TypingTutorialScreen, mapUnit)
        : () => void engine().navigation.showPopup(TypingTutorialPopup, mapUnit);
    case 'game':
      // Game levels have no tutorial, so the help button is hidden.
      return undefined;
  }
}
