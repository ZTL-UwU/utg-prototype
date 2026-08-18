import { isLevelTypeId, parseLevelProps } from '@utg/level-types';
import { Assets, type TextDropShadow } from 'pixi.js';
import { create } from 'zustand';

import {
  getMascotIdleAlias,
  getMascotSadAlias,
  getMascotStarAlias,
  REMOTE_MASCOTS_BUNDLE,
  type LevelScreenConstructor,
  type SplashColorScheme,
  type TLayer,
  type TLevel,
  type TMapUnit,
  type TMascotAssets,
} from '../app/screens/level-map/units';
import { api } from '../lib/api';
import { mediaUrl } from '../lib/media';
import { ensureRemoteReady, type RemoteStatus } from '../lib/remoteResource';

/** Client-only shadow for non-curved unit titles (not sent by the API). */
const textDropShadow: Partial<TextDropShadow> = {
  color: 0x000000,
  blur: 5,
  distance: 0,
  alpha: 0.75,
};

interface ApiImage {
  name: string;
  url: string;
  filename: string;
}

interface ApiMascot {
  id: number;
  name: string | null;
  idle_image: ApiImage;
  sad_image: ApiImage;
  zero_star_image: ApiImage;
  one_star_image: ApiImage;
  two_star_image: ApiImage;
  three_star_image: ApiImage;
}

interface ApiLevel {
  id: number;
  sort_order: number;
  layer: string;
  title: string | null;
  level_type: string;
  level_props: Record<string, unknown> | null;
  mascot: ApiMascot | null;
  splash_button_color: number | null;
  splash_button_text_color: number | null;
  splash_level_font_color: number | null;
  splash_level_title_color: number | null;
  show_mascot_on_splash: boolean;
  backdrop_color: number;
}

interface ApiUnit {
  id: number;
  sort_order: number;
  layer: string;
  title: string;
  title_font_size: number;
  title_font_color: number;
  title_is_curved: boolean;
  subtitle_text: string | null;
  subtitle_font_size: number | null;
  subtitle_font_color: number | null;
  background_asset_path: string;
  levels: ApiLevel[];
}

interface CourseStore {
  status: RemoteStatus;
  error?: string;
  unitsByLayer: Record<TLayer, TMapUnit[]>;
  fetchCourseStructure: () => Promise<void>;
}

const EMPTY_UNITS: Record<TLayer, TMapUnit[]> = {
  education: [],
  typing: [],
  game: [],
};

function isLayer(value: string): value is TLayer {
  return value === 'education' || value === 'typing' || value === 'game';
}

function mapMascotAssets(mascot: ApiMascot | null): TMascotAssets | null {
  if (
    !mascot?.idle_image?.url ||
    !mascot.sad_image?.url ||
    !mascot.zero_star_image?.url ||
    !mascot.one_star_image?.url ||
    !mascot.two_star_image?.url ||
    !mascot.three_star_image?.url
  ) {
    return null;
  }
  return {
    idleAlias: getMascotIdleAlias(mascot.id),
    sadAlias: getMascotSadAlias(mascot.id),
    starAliases: [
      getMascotStarAlias(mascot.id, 0),
      getMascotStarAlias(mascot.id, 1),
      getMascotStarAlias(mascot.id, 2),
      getMascotStarAlias(mascot.id, 3),
    ],
  };
}

function registerMascotsBundle(units: ApiUnit[]): void {
  const seen = new Set<number>();
  const entries: { alias: string; src: string }[] = [];

  for (const unit of units) {
    for (const level of unit.levels) {
      const mascot = level.mascot;
      if (!mascot?.idle_image?.url || !mascot.sad_image?.url || seen.has(mascot.id)) continue;
      seen.add(mascot.id);
      entries.push(
        { alias: getMascotIdleAlias(mascot.id), src: mediaUrl(mascot.idle_image.url) },
        { alias: getMascotSadAlias(mascot.id), src: mediaUrl(mascot.sad_image.url) },
        { alias: getMascotStarAlias(mascot.id, 0), src: mediaUrl(mascot.zero_star_image.url) },
        { alias: getMascotStarAlias(mascot.id, 1), src: mediaUrl(mascot.one_star_image.url) },
        { alias: getMascotStarAlias(mascot.id, 2), src: mediaUrl(mascot.two_star_image.url) },
        { alias: getMascotStarAlias(mascot.id, 3), src: mediaUrl(mascot.three_star_image.url) },
      );
    }
  }

  Assets.addBundle(REMOTE_MASCOTS_BUNDLE, entries);
  if (entries.length > 0) {
    void Assets.backgroundLoadBundle(REMOTE_MASCOTS_BUNDLE);
  }
}

function mapSplashColorScheme(level: ApiLevel): SplashColorScheme {
  return {
    BUTTON_FILL: level.splash_button_color ?? 0xc08e82,
    BUTTON_TEXT_FILL: level.splash_button_text_color ?? 0xffffff,
    LEVEL_FONT_FILL: level.splash_level_font_color ?? 0xffffff,
    LEVEL_TITLE_FILL: level.splash_level_title_color ?? 0xffffff,
  };
}

function mapLevel(
  level: ApiLevel,
  screens: Partial<Record<string, LevelScreenConstructor>>,
): TLevel | null {
  if (!isLevelTypeId(level.level_type)) return null;

  const levelType = level.level_type;
  // TS cannot prove levelType/props stay paired when building a discriminated union.
  return {
    id: level.id,
    title: level.title ?? undefined,
    unlocked: true,
    mascot: mapMascotAssets(level.mascot),
    screen: screens[levelType],
    backdropColor: level.backdrop_color,
    splashColorScheme: mapSplashColorScheme(level),
    mascotOnSplash: level.show_mascot_on_splash,
    levelType,
    props: parseLevelProps(levelType, level.level_props),
  } as TLevel;
}

function mapUnit(
  unit: ApiUnit,
  screens: Partial<Record<string, LevelScreenConstructor>>,
): TMapUnit | null {
  if (!isLayer(unit.layer)) return null;

  const isCurved = unit.title_is_curved;
  const levels = unit.levels
    .map((level) => mapLevel(level, screens))
    .filter((level): level is TLevel => level != null);

  const mapUnit: TMapUnit = {
    id: unit.id,
    type: unit.layer,
    background: unit.background_asset_path,
    title: {
      text: unit.title,
      fontSize: unit.title_font_size,
      fontColor: unit.title_font_color,
      isCurved,
      ...(isCurved ? {} : { dropShadow: textDropShadow }),
    },
    levels,
  };

  if (
    unit.subtitle_text != null &&
    unit.subtitle_font_size != null &&
    unit.subtitle_font_color != null
  ) {
    mapUnit.subtitle = {
      text: unit.subtitle_text,
      fontSize: unit.subtitle_font_size,
      fontColor: unit.subtitle_font_color,
    };
  }

  return mapUnit;
}

function groupUnitsByLayer(
  units: ApiUnit[],
  screens: Partial<Record<string, LevelScreenConstructor>>,
): Record<TLayer, TMapUnit[]> {
  const grouped: Record<TLayer, TMapUnit[]> = {
    education: [],
    typing: [],
    game: [],
  };

  for (const unit of units) {
    const mapped = mapUnit(unit, screens);
    if (!mapped) continue;
    grouped[mapped.type].push(mapped);
  }

  return grouped;
}

const useCourseStore = create<CourseStore>((set, get) => ({
  status: 'idle',
  error: undefined,
  unitsByLayer: EMPTY_UNITS,
  fetchCourseStructure: async () => {
    const { status } = get();
    if (status === 'loading' || status === 'ready') return;

    set({ status: 'loading', error: undefined });
    try {
      // Lazy-load screens so this module does not cycle with screen → units → store.
      const { LEVEL_TYPE_SCREENS } = await import('../app/screens/level-map/screenRegistry');
      const units = await api<ApiUnit[]>('/units/list');
      registerMascotsBundle(units);
      set({
        status: 'ready',
        error: undefined,
        unitsByLayer: groupUnitsByLayer(units, LEVEL_TYPE_SCREENS),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load course structure';
      registerMascotsBundle([]);
      set({
        status: 'error',
        error: message,
        unitsByLayer: EMPTY_UNITS,
      });
    }
  },
}));

/** Resolves when the course catalog is ready; false if the fetch failed. Never navigates. */
export function ensureCourseCatalogReady(): Promise<boolean> {
  return ensureRemoteReady({
    getStatus: () => useCourseStore.getState().status,
    subscribe: (listener) => useCourseStore.subscribe((state) => listener(state.status)),
    start: () => {
      void useCourseStore.getState().fetchCourseStructure();
    },
  });
}

/**
 * Resolves when the course catalog is ready.
 * On error, navigates to CourseLoadErrorScreen and returns false.
 */
export async function ensureCourseReady(): Promise<boolean> {
  if (await ensureCourseCatalogReady()) return true;

  const { CourseLoadErrorScreen } = await import('../app/screens/course-load-error');
  const { engine } = await import('../engine/getEngine');
  await engine().navigation.showScreen(CourseLoadErrorScreen);
  return false;
}

export default useCourseStore;

export { REMOTE_MASCOTS_BUNDLE };

/** Resolves when the remote mascots bundle has been registered with the course catalog. */
export function ensureMascotsReady(): Promise<boolean> {
  return ensureCourseCatalogReady();
}
