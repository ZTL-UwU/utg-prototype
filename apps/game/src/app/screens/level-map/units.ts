import type { LevelTypeId, LevelTypeProps } from '@utg/level-types';
import type { TextDropShadow } from 'pixi.js';

import type { AppScreenConstructor } from '../../../engine/navigation/navigation';
import useCourseStore from '../../../zustandStores/courseStore';

export type TLayer = 'typing' | 'education' | 'game';

export const REMOTE_MASCOTS_BUNDLE = 'remote-mascots';

export type TMascotAssets = {
  idleAlias: string;
  sadAlias: string;
  starAliases: readonly [string, string, string, string];
};

export function getMascotIdleAlias(mascotId: number): string {
  return `${REMOTE_MASCOTS_BUNDLE}/${mascotId}/idle`;
}

export function getMascotSadAlias(mascotId: number): string {
  return `${REMOTE_MASCOTS_BUNDLE}/${mascotId}/sad`;
}

export function getMascotStarAlias(mascotId: number, stars: 0 | 1 | 2 | 3): string {
  return `${REMOTE_MASCOTS_BUNDLE}/${mascotId}/${stars}-star`;
}

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
  /** Catalog availability; play-order locks live in `lib/progression`. */
  unlocked: boolean;
  mascot: TMascotAssets | null;
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
