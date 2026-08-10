import type { LevelTypeId, LevelTypeProps } from '@utg/level-types';
import type { TextDropShadow } from 'pixi.js';

import type { AppScreenConstructor } from '../../../engine/navigation/navigation';
import useCourseStore from '../../../zustandStores/courseStore';

export type TLayer = 'typing' | 'education' | 'game';

/**
 * A level screen owns its splash background and tutorial images, so they stay
 * consistent everywhere the screen is reused instead of being restated per level.
 */
export type LevelScreenConstructor = AppScreenConstructor<any[]> & {
  helpAssets: string[];
  splashBackgroundAsset: string;
};

export type SplashColorScheme = {
  BUTTON_FILL: number;
  BUTTON_TEXT_FILL: number;
  LEVEL_FONT_FILL: number;
  LEVEL_TITLE_FILL: number;
};

type TLevelBase = {
  id: number;
  title?: string;
  unlocked: boolean;
  mascot: 'sheep' | 'goat' | 'camel' | 'chef';
  screen?: LevelScreenConstructor;
  backdropColor: number;
  splashColorScheme?: SplashColorScheme;
  mascotOnSplash: boolean;
};

/** Level narrowed to a single registered `level_type` with matching props. */
export type TLevelOf<T extends LevelTypeId> = TLevelBase & {
  levelType: T;
  props: LevelTypeProps[T];
};

/** Discriminated union of all level types — narrow via `level.levelType`. */
export type TLevel = { [K in LevelTypeId]: TLevelOf<K> }[LevelTypeId];

/**
 * Narrow a catalog level to a specific type. Screens should call this at the
 * boundary so `level.props` is typed for that level type.
 */
export function getTypedLevel<T extends LevelTypeId>(level: TLevel, levelType: T): TLevelOf<T> {
  if (level.levelType !== levelType) {
    throw new Error(`Expected level type "${levelType}", got "${level.levelType}"`);
  }
  // Control-flow narrowing does not correlate `levelType` with `props` on the union.
  return level as TLevelOf<T>;
}

export type TMapUnit = {
  id: number;
  type: TLayer;
  background: string;
  title: {
    text: string;
    fontSize: number;
    fontColor: number;
    isCurved: boolean;
    dropShadow?: Partial<TextDropShadow>;
  };
  subtitle?: {
    text: string;
    fontSize: number;
    fontColor: number;
  };
  levels: TLevel[];
};

function allMaps(): TMapUnit[] {
  const { unitsByLayer } = useCourseStore.getState();
  return [...unitsByLayer.education, ...unitsByLayer.typing, ...unitsByLayer.game];
}

export function getLayerMaps(layer: TLayer): TMapUnit[] {
  return useCourseStore.getState().unitsByLayer[layer];
}

export function getMapCollection(mapUnit: TMapUnit): TMapUnit[] {
  return getLayerMaps(mapUnit.type);
}

export function getPrevMap(mapUnit: TMapUnit): TMapUnit | undefined {
  const maps = getMapCollection(mapUnit);
  const index = maps.findIndex((map) => map.id === mapUnit.id);
  return index > 0 ? maps[index - 1] : undefined;
}

export function getNextMap(mapUnit: TMapUnit): TMapUnit | undefined {
  const maps = getMapCollection(mapUnit);
  const index = maps.findIndex((map) => map.id === mapUnit.id);
  return index >= 0 && index < maps.length - 1 ? maps[index + 1] : undefined;
}

export function findMapUnitForLevel(level: TLevel): TMapUnit {
  const mapUnit = allMaps().find((map) => map.levels.some((entry) => entry.id === level.id));
  if (!mapUnit) {
    throw new Error(`No map unit found for level ${level.id}`);
  }
  return mapUnit;
}

export function getLevelType(level: TLevel): TLayer {
  return findMapUnitForLevel(level).type;
}

export function getNextLevelAfter(
  currentLevel: TLevel,
): { mapUnit: TMapUnit; level: TLevel } | undefined {
  const mapUnit = findMapUnitForLevel(currentLevel);
  const currentLevelIndex = mapUnit.levels.findIndex((entry) => entry.id === currentLevel.id);

  if (currentLevelIndex === -1) return;

  const maps = getMapCollection(mapUnit);
  let mapIndex = maps.findIndex((map) => map.id === mapUnit.id);
  let nextLevelIndex = currentLevelIndex + 1;

  while (mapIndex >= 0 && mapIndex < maps.length) {
    const nextMapUnit = maps[mapIndex];
    const nextLevel = nextMapUnit.levels
      .slice(nextLevelIndex)
      .find((level) => level.unlocked && level.screen);
    if (nextLevel?.screen) {
      return { mapUnit: nextMapUnit, level: nextLevel };
    }

    mapIndex += 1;
    nextLevelIndex = 0;
  }
}
