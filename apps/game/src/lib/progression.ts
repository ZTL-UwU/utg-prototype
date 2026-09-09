import type { LevelTypeId } from '@utg/level-types';

import {
  findMapUnitForLevel,
  getLayerMaps,
  type TLayer,
  type TLevel,
  type TMapUnit,
} from '../app/screens/level-map/units';
import { useAuthStore } from '../zustandStores/auth';
import useResultStore from '../zustandStores/resultStore';

const LAYER_PREREQUISITE: Record<TLayer, TLayer | null> = {
  education: null,
  typing: 'education',
  game: 'typing',
};

/**
 * Drills rather than milestones: endlessly replayable, never scored, so they can never
 * earn a star. They stay in the play order, but a lock must never wait on one.
 */
const NON_GATING_LEVEL_TYPES: ReadonlySet<LevelTypeId> = new Set<LevelTypeId>(['typing-test']);

function gatesProgression(level: TLevel): boolean {
  return !NON_GATING_LEVEL_TYPES.has(level.levelType);
}

function playableLevels(mapUnit: TMapUnit): TLevel[] {
  return mapUnit.levels.filter((level) => level.unlocked && level.screen);
}

function playableLevelsInLayer(layer: TLayer): TLevel[] {
  return getLayerMaps(layer).flatMap(playableLevels);
}

/**
 * Play-order locks are derived from server results, so a list we failed to fetch means
 * "unknown", not "locked": the `isXUnlocked` predicates below fall open to plain catalog
 * availability rather than shut a player out of progress they already earned. Callers
 * reach those predicates after awaiting `ensureResultsReady`, so `idle` and `loading`
 * are transient and stay gated instead of flashing unearned content.
 */
function progressionUnknown(): boolean {
  return useResultStore.getState().status === 'error';
}

function isCheatUnlocked(): boolean {
  return useAuthStore.getState().user?.is_cheat === true;
}

export function hasCompletedLevel(levelId: number): boolean {
  return useResultStore.getState().hasCompletedLevel(levelId);
}

/** True when every gating level in the layer has a starred result. */
export function isLayerComplete(layer: TLayer): boolean {
  const levels = playableLevelsInLayer(layer).filter(gatesProgression);
  return levels.length > 0 && levels.every((level) => hasCompletedLevel(level.id));
}

/** Education is open first; each later layer waits on the previous one. */
export function isLayerUnlocked(layer: TLayer): boolean {
  if (isCheatUnlocked() || progressionUnknown()) return true;
  const prerequisite = LAYER_PREREQUISITE[layer];
  return prerequisite === null || isLayerComplete(prerequisite);
}

export function isMapUnitComplete(mapUnit: TMapUnit): boolean {
  return playableLevels(mapUnit)
    .filter(gatesProgression)
    .every((level) => hasCompletedLevel(level.id));
}

/**
 * Education and typing units unlock in order. Challenge maps all unlock together
 * once the typing layer is finished.
 */
export function isMapUnitUnlocked(mapUnit: TMapUnit): boolean {
  if (isCheatUnlocked() || progressionUnknown()) return true;
  if (!isLayerUnlocked(mapUnit.type)) return false;
  if (mapUnit.type === 'game') return true;

  const maps = getLayerMaps(mapUnit.type);
  const index = maps.findIndex((entry) => entry.id === mapUnit.id);
  if (index <= 0) return index === 0;
  return isMapUnitComplete(maps[index - 1]);
}

/**
 * Education and typing levels unlock one after another. Challenge games all
 * unlock at once after the typing layer is complete. Non-gating levels keep their
 * slot in the sequence, so they stay reachable and still wait on the level before them.
 */
export function isLevelUnlocked(level: TLevel): boolean {
  if (!level.unlocked || !level.screen) return false;
  if (isCheatUnlocked() || progressionUnknown()) return true;

  let mapUnit: TMapUnit;
  try {
    mapUnit = findMapUnitForLevel(level);
  } catch {
    return false;
  }

  if (!isLayerUnlocked(mapUnit.type)) return false;
  if (mapUnit.type === 'game') return true;

  const sequence = playableLevelsInLayer(mapUnit.type);
  const index = sequence.findIndex((entry) => entry.id === level.id);
  if (index <= 0) return index === 0;
  return hasCompletedLevel(sequence[index - 1].id);
}

export function getNextLevelAfter(
  currentLevel: TLevel,
): { mapUnit: TMapUnit; level: TLevel } | undefined {
  let mapUnit: TMapUnit;
  try {
    mapUnit = findMapUnitForLevel(currentLevel);
  } catch {
    return;
  }

  const sequence = playableLevelsInLayer(mapUnit.type);
  const index = sequence.findIndex((entry) => entry.id === currentLevel.id);
  if (index < 0) return;

  const nextLevel = sequence[index + 1];
  if (!nextLevel || !isLevelUnlocked(nextLevel)) return;
  return { mapUnit: findMapUnitForLevel(nextLevel), level: nextLevel };
}
