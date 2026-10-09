/**
 * Adding a screen: define its route below, then list it in `routes`.
 *
 *     // No props
 *     defineRoute({ path: '/letters', screen: LetterReferenceScreen });
 *
 *     // With props
 *     defineRoute({
 *       path: '/:layer/maps/:mapId',
 *       screen: LevelMapScreen,
 *       guards: [player, course],
 *       load: ({ mapId }) => mapById(mapId),                               // URL → props
 *       params: (mapUnit) => ({ layer: mapUnit.type, mapId: mapUnit.id }), // props → URL
 *     });
 *
 * - `load`: gets path and query params as strings (`parseId` for ids). Return nothing for
 *   "not found" (falls back home), or `redirect(href)`.
 * - `params`: keys not in the path become the query. Return nothing to let the next route for
 *   the same screen take it (`resetPassword` → `auth`).
 * - `guards`: `[player, course]` for in-game screens, `[session]` for signed-in only,
 *   `[levelPlayer, course]` for a level's own URL (shareable with `VITE_OPEN_ACCESS`).
 * - `transient`: Back skips this screen (login, level play).
 * - `oneOf(screens, pick)`: one route for several screens (`levelPlay`).
 *
 * Screens still navigate with `navigation.showScreen(Screen, props)`; the URL follows. For
 * links and redirects, use `route.href(values)`. Screens with no URL go in `routelessScreens`.
 */
import { AvatarSelectScreen } from '../app/screens/avatar-select';
import { CourseLoadErrorScreen } from '../app/screens/course-load-error';
import { EducationTutorialScreen } from '../app/screens/education-level/level-tutorial';
import { EducationYoutubeScreen } from '../app/screens/education-level/youtube-videos';
import { HomeScreen } from '../app/screens/home';
import { AuthScreen } from '../app/screens/home/auth';
import { LayerSelectScreen } from '../app/screens/layer-select';
import { LetterReferenceScreen } from '../app/screens/letter-reference';
import { LevelMapScreen } from '../app/screens/level-map';
import { LEVEL_TYPE_SCREENS } from '../app/screens/level-map/screenRegistry';
import {
  findLayerForLevelId,
  findLevel,
  findMapUnit,
  getLayerMaps,
  type TLayer,
  type TLevel,
  type TMapUnit,
} from '../app/screens/level-map/units';
import { EducationLevelSelect } from '../app/screens/level-select/education-level-select';
import { LevelSplashScreen } from '../app/screens/level-splash';
import { TypingTutorialScreen } from '../app/screens/typing-level/level-tutorial';
import { isLevelUnlocked } from '../lib/progression';
import useSessionStore from '../zustandStores/sessionStore';
import {
  defineRoute,
  oneOf,
  parseId,
  redirect,
  type AnyScreen,
  type Route,
} from './core/defineRoute';
import { formatHref, parseHref } from './core/path';
import { course, levelPlayer, player, session } from './guards';

function mapById(mapId: string | undefined): TMapUnit | undefined {
  const id = parseId(mapId);
  return id === undefined ? undefined : findMapUnit(id);
}

/** A map by id, only from `layer`. */
function mapIn(layer: TLayer, mapId: string | undefined): TMapUnit | undefined {
  const mapUnit = mapById(mapId);
  return mapUnit?.type === layer ? mapUnit : undefined;
}

/** A level the player can open: in the catalog and backed by a screen. */
function playableLevel(levelId: string) {
  const id = parseId(levelId);
  const found = id === undefined ? undefined : findLevel(id);
  return found?.level.screen ? found : undefined;
}

/**
 * A `?next=` worth returning to: a page of this app, and not one of the steps of getting in.
 * Anything else is dropped, so a crafted link cannot send a player off-site after login.
 */
function returnTo(next: string | undefined): string | undefined {
  // `//host` and `/\host` are protocol-relative: they leave the site.
  if (!next?.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return;
  const location = parseHref(next);
  const route = routes.find((candidate) => candidate.match(location));
  if (!route || route === auth || route === resetPassword || route === avatarSelect) return;
  return formatHref(location);
}

export const home = defineRoute({ path: '/', screen: HomeScreen });

/** The link the backend emails. Listed before `/auth` so an auth screen with a reset shows here. */
export const resetPassword = defineRoute({
  path: '/reset-password',
  screen: AuthScreen,
  transient: true,
  load: ({ uid, token }) => (uid && token ? { passwordReset: { uid, token } } : redirect('/auth')),
  params: (props) => props?.passwordReset,
});

/** `?next=` is where the player continues once they are in, instead of the layer select. */
export const auth = defineRoute({
  path: '/auth',
  screen: AuthScreen,
  transient: true,
  load: ({ next }) => ({ returnTo: returnTo(next) }),
  params: (props) => ({ next: props?.returnTo }),
});

export const avatarSelect = defineRoute({
  path: '/avatar-select',
  screen: AvatarSelectScreen,
  guards: [session],
  transient: true,
  load: ({ next }) => ({ returnTo: returnTo(next) }),
  params: (props) => ({ next: props?.returnTo }),
});

export const layerSelect = defineRoute({
  path: '/layers',
  screen: LayerSelectScreen,
  guards: [player, course],
});

export const letters = defineRoute({ path: '/letters', screen: LetterReferenceScreen });

export const educationSelect = defineRoute({
  path: '/education',
  screen: EducationLevelSelect,
  guards: [player, course],
});

/** `?map=` is where Back returns; without it, Back goes to the alphabet select. */
export const educationTutorial = defineRoute({
  path: '/education/tutorial',
  screen: EducationTutorialScreen,
  guards: [player, course],
  load: ({ map }) => ({ mapUnit: mapIn('education', map) }),
  params: ({ mapUnit }) => ({ map: mapUnit?.id }),
});

export const educationVideos = defineRoute({
  path: '/education/videos',
  screen: EducationYoutubeScreen,
  guards: [player, course],
  load: ({ map }) => ({ mapUnit: mapIn('education', map) }),
  params: ({ mapUnit }) => ({ map: mapUnit?.id }),
});

export const typingTutorial = defineRoute({
  path: '/typing/tutorial',
  screen: TypingTutorialScreen,
  guards: [player, course],
  load: ({ map }) => mapIn('typing', map) ?? getLayerMaps('typing')[0],
  params: (mapUnit) => ({ map: mapUnit.id }),
});

/** Ids identify maps and levels; the layer segment is for reading and is corrected if wrong. */
export const levelMap = defineRoute({
  path: '/:layer/maps/:mapId',
  screen: LevelMapScreen,
  guards: [player, course],
  load: ({ mapId }) => mapById(mapId),
  params: (mapUnit) => ({ layer: mapUnit.type, mapId: mapUnit.id }),
});

export const levelSplash = defineRoute({
  path: '/:layer/levels/:levelId',
  screen: LevelSplashScreen,
  guards: [levelPlayer, course],
  load: ({ levelId }) => playableLevel(levelId),
  params: ({ level, mapUnit }) => ({ layer: mapUnit.type, levelId: level.id }),
});

/**
 * Gameplay for every level type: new types only need an entry in `LEVEL_TYPE_SCREENS`.
 * Opening it directly (refresh, Back/Forward) starts a fresh attempt, the way the splash's
 * START does, and a locked level sends the player to its splash.
 */
export const levelPlay = defineRoute({
  path: '/:layer/levels/:levelId/play',
  screen: oneOf(Object.values(LEVEL_TYPE_SCREENS), (level: TLevel) => level.screen),
  guards: [levelPlayer, course],
  transient: true,
  load: ({ levelId }) => {
    const found = playableLevel(levelId);
    if (!found) return;

    const { level, mapUnit } = found;
    if (!isLevelUnlocked(level)) {
      return redirect(levelSplash.href({ layer: mapUnit.type, levelId: level.id }));
    }
    useSessionStore.getState().startSession(mapUnit.type);
    return level;
  },
  params: (level) => {
    const layer = findLayerForLevelId(level.id);
    return layer && { layer, levelId: level.id };
  },
});

/**
 * Every URL the game answers to. A visit takes the first route whose path matches; a screen
 * change takes the first route that can show it, so order matters only between routes sharing
 * a screen.
 */
export const routes: readonly Route[] = [
  home,
  resetPassword,
  auth,
  avatarSelect,
  layerSelect,
  letters,
  educationSelect,
  educationTutorial,
  educationVideos,
  typingTutorial,
  levelMap,
  levelSplash,
  levelPlay,
];

/** Where unknown URLs, and URLs naming something that no longer exists, end up. */
export const fallback = home;

/**
 * Screens with no URL of their own. While one is up, the address bar keeps the URL that led
 * there, so a refresh retries it.
 */
export const routelessScreens: ReadonlySet<AnyScreen> = new Set([CourseLoadErrorScreen]);
