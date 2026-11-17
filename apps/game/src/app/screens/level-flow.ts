import type { Container } from 'pixi.js';

import { engine } from '../../engine/getEngine';
import { submitLevelResult, type LevelResultOutcome } from '../../lib/levelResults';
import { isMapUnitComplete } from '../../lib/progression';
import { useLevelProgress } from '../../zustandStores/levelProgressStore';
import { getStarCount, useScoreManager } from '../../zustandStores/scoreManager';
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

/** One finished run of a level, as the end popup shows it. */
export type LevelRun = {
  correct: number;
  mistakes: number;
  accuracy: number;
  starCount: number;
  /** The backend result, unawaited so it overlaps the end popup's animations. */
  submitted: Promise<LevelResultOutcome>;
};

/**
 * Record the session's run of `level`: the score history, the level result, and the map's
 * progress flags. Resets the session, so the returned run holds the only copy of its counts.
 */
export function recordLevelResult(level: TLevel): LevelRun {
  const { correct, mistakes } = useSessionStore.getState();
  useSessionStore.getState().reset();
  useScoreManager.getState().addSession(correct, mistakes);

  const total = correct + mistakes;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
  const starCount = getStarCount(accuracy);
  const submitted = submitLevelResult({
    level: level.id,
    star: starCount,
    // No per-level score exists; the correct count stands in for one.
    score: correct,
    correct,
    mistake: mistakes,
  });

  const mapUnit = findMapUnitForLevel(level);
  if (starCount > 0) {
    const progress = useLevelProgress.getState();
    progress.markAttempted(mapUnit.type, level.id);
    if (mapUnit.type === 'education' && isMapUnitComplete(mapUnit)) {
      progress.queueMapUnitAnimation(mapUnit.type, mapUnit.id);
    }
  }
  return { correct, mistakes, accuracy, starCount, submitted };
}

/**
 * End a level: record the run and show the end popup. Does nothing once `screen` has left, so
 * a round that resolves after the player quit cannot open the popup over the map.
 */
export function finishLevel(screen: Container, level: TLevel) {
  if (screen.destroyed || engine().navigation.currentScreen !== screen) return;
  void engine().navigation.showPopup(EndScreenPopup, { level, run: recordLevelResult(level) });
}
