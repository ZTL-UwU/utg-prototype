import { EducationTutorialScreen } from '../app/screens/education-level/level-tutorial';
import { HomeScreen } from '../app/screens/home';
import { LayerSelectScreen } from '../app/screens/layer-select';
import { LevelMapScreen } from '../app/screens/level-map';
import { educationMaps, gameMaps, typingMaps, type TLayer } from '../app/screens/level-map/units';
import { LevelSplashScreen } from '../app/screens/level-splash';
import { TypingTutorialScreen } from '../app/screens/typing-level/level-tutorial';
import type { AppScreenConstructor, Navigation } from '../engine/navigation/navigation';

type ScreenConstructor = AppScreenConstructor<any[]>;

type ScreenTarget = {
  ctor: ScreenConstructor;
  props?: unknown;
};

type ScreenRoute = ScreenTarget & {
  path: string;
  matches: (ctor: ScreenConstructor, props?: unknown) => boolean;
};

function route(
  path: string,
  ctor: ScreenConstructor,
  props?: unknown,
  matches?: ScreenRoute['matches'],
): ScreenRoute {
  return {
    path,
    ctor,
    props,
    matches:
      matches ??
      ((candidateCtor, candidateProps) =>
        candidateCtor === ctor && (props === undefined || candidateProps === props)),
  };
}

function mapRoutes(type: TLayer, maps: typeof educationMaps) {
  return maps.flatMap((mapUnit, index) => {
    const mapPath = `/${type}/maps/${index + 1}`;

    return [
      route(mapPath, LevelMapScreen, mapUnit),
      ...(type !== 'game'
        ? [
            type === 'education'
              ? route(`${mapPath}/tutorial`, EducationTutorialScreen, { mapUnit })
              : route(`${mapPath}/tutorial`, TypingTutorialScreen, mapUnit),
          ]
        : []),
      ...mapUnit.levels.flatMap((level) => {
        if (!level.screen) return [];
        const levelPath = `/${type}/levels/${level.id}`;
        return [
          route(levelPath, level.screen, level),
          route(`${levelPath}/splash`, LevelSplashScreen, { level, mapUnit }),
        ];
      }),
    ];
  });
}

const screenRoutes: ScreenRoute[] = [
  route('/home', HomeScreen),
  route('/layers', LayerSelectScreen),
  ...mapRoutes('education', educationMaps),
  ...mapRoutes('typing', typingMaps),
  ...mapRoutes('game', gameMaps),
];

function normalizePath(path: string) {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
}

class DebugScreenRouter {
  private navigation?: Navigation;
  private pendingPath?: string;
  private replaceNextUrl = true;
  private unsubscribeFromNavigation?: () => void;

  public async start(navigation: Navigation) {
    this.navigation = navigation;
    this.unsubscribeFromNavigation = navigation.onScreenChange((ctor, props) => {
      this.updateUrl(ctor, props);
    });
    window.addEventListener('popstate', this.handleBrowserNavigation);
    window.addEventListener('hashchange', this.handleBrowserNavigation);
    await this.navigateToCurrentUrl();
    this.replaceNextUrl = false;
  }

  public stop() {
    this.unsubscribeFromNavigation?.();
    window.removeEventListener('popstate', this.handleBrowserNavigation);
    window.removeEventListener('hashchange', this.handleBrowserNavigation);
  }

  private readonly handleBrowserNavigation = () => {
    void this.navigateToCurrentUrl();
  };

  private currentPath() {
    return normalizePath(window.location.hash.slice(1));
  }

  private async navigateToCurrentUrl() {
    if (!this.navigation) return;
    const path = this.currentPath();
    if (this.pendingPath === path) return;

    const target = screenRoutes.find((candidate) => candidate.path === path);
    this.pendingPath = path;

    try {
      if (this.navigation.currentPopup) {
        await this.navigation.hidePopup();
      }
      if (target) {
        await this.navigation.showScreen(target.ctor, target.props);
      } else {
        this.replaceNextUrl = true;
        await this.navigation.showScreen(HomeScreen);
      }
    } finally {
      this.pendingPath = undefined;
    }
  }

  private updateUrl(ctor: ScreenConstructor, props?: unknown) {
    const screenRoute = screenRoutes.find((candidate) => candidate.matches(ctor, props));
    if (!screenRoute || this.currentPath() === screenRoute.path) return;

    const url = new URL(window.location.href);
    url.hash = screenRoute.path;
    const method = this.replaceNextUrl ? 'replaceState' : 'pushState';
    window.history[method](null, '', url);
    this.replaceNextUrl = false;
  }
}

export const debugScreenRouter = new DebugScreenRouter();
