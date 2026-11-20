import { Container, type DestroyOptions } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import { topClearance } from '../../engine/utils/viewport';
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
  /** A tutorial opened by the screen itself, for screens that show no single map unit. */
  | { kind: 'tutorial'; onPress: () => void };

/** Distance from the top of the view to the HUD buttons' top edge, below the notch on phones. */
const HUD_TOP = 90;

export function hudButtonTop(viewHeight: number) {
  return HUD_TOP + topClearance(viewHeight);
}

interface HUDProps {
  onBack: () => void;
  help?: THudHelp;
}

export class HUD extends Container {
  private readonly buttons: Container[] = [];

  constructor({ onBack, help }: HUDProps) {
    super({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    });

    this.buttons.push(new BackButton(onBack));
    const onHelp = help && createHelpAction(help);
    if (onHelp) this.buttons.push(new HelpButton({ onPress: onHelp, icon: help.kind }));
    this.addChild(...this.buttons);

    this.place();
    // The notch clearance comes and goes as the window crosses the phone breakpoint
    engine().renderer.on('resize', this.place);
  }

  private readonly place = () => {
    // The renderer's own height: navigation's may not have caught up within this resize
    const top = hudButtonTop(engine().renderer.height);
    for (const button of this.buttons) button.layout = { top };
  };

  public override destroy(options?: DestroyOptions) {
    engine().renderer.off('resize', this.place);
    super.destroy(options);
  }
}

function createHelpAction(help: THudHelp): (() => void) | undefined {
  if ('onPress' in help) return help.onPress;
  const { mapUnit, presentation } = help;
  switch (mapUnit.type) {
    case 'education':
      return presentation === 'screen'
        ? () => void engine().navigation.showScreen(EducationTutorialScreen, { mapUnit })
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
