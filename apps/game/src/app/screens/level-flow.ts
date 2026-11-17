import type { Container } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import { useScoreManager } from '../../zustandStores/scoreManager';
import useSessionStore from '../../zustandStores/sessionStore';
import { EndScreenPopup } from '../popups/end-screen';
import { QuitPopup } from '../popups/quit';
import { HUD } from '../ui/hud';
import { LevelMapScreen } from './level-map';
import { findMapUnitForLevel, type TLevel } from './level-map/units';

type LevelHudOptions = {
  /** Runs when the player confirms quitting, before the map opens. */
  onQuit?: () => void;
};

/**
 * The HUD every level screen shows: Back asks to quit and returns to the level's map, and Help
 * opens the unit's tutorial (game units have none, so they show no Help button).
 */
export function createLevelHud(level: TLevel, { onQuit }: LevelHudOptions = {}): HUD {
  const mapUnit = findMapUnitForLevel(level);
  return new HUD({
    onBack: () =>
      void engine().navigation.showPopup(QuitPopup, {
        mascot: level.mascot,
        onQuit: () => {
          onQuit?.();
          void engine().navigation.showScreen(LevelMapScreen, mapUnit);
        },
      }),
    help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
  });
}

/**
 * End a level: record the session's score and show the end popup. Does nothing once `screen`
 * has left, so a round that resolves after the player quit cannot open the popup over the map.
 */
export function finishLevel(screen: Container, level: TLevel) {
  if (screen.destroyed || engine().navigation.currentScreen !== screen) return;
  const { correct, mistakes } = useSessionStore.getState();
  useScoreManager.getState().addSession(correct, mistakes);
  void engine().navigation.showPopup(EndScreenPopup, { level });
}
