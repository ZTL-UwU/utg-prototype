import type { AppScreenConstructor, Navigation } from '../../engine/navigation/navigation';
import { useOverlayStore } from '../../zustandStores/overlayStore';
import { fallback, routelessScreens, routes } from '../routes';
import { Redirect, type AnyScreen, type Route, type ScreenTarget } from './defineRoute';
import { formatHref, fromBrowserUrl, parseHref, toBrowserUrl, type AppLocation } from './path';

/** Guards and loaders that keep redirecting are a bug; stop instead of hanging the tab. */
const MAX_REDIRECTS = 8;

const BASE = import.meta.env.BASE_URL;

function readLocation(): AppLocation {
  return fromBrowserUrl(window.location, BASE);
}

function routeAt(location: AppLocation): Route | undefined {
  return routes.find((route) => route.match(location));
}

/**
 * Keeps the address bar and the screen in step, in both directions:
 *
 * - Screens keep navigating with `navigation.showScreen(Screen, props)`. Each change is
 *   written to the URL by the first route that can show that screen with those props.
 * - Loading the page or moving through history resolves the URL through the same routes:
 *   guards, then the loader that rebuilds the screen's props from the URL.
 */
class Router {
  private navigation?: Navigation;
  private unsubscribe?: () => void;
  /** The href the router last wrote or visited; a history move to the same one is a no-op. */
  private href?: string;
  /** The screen a visit is showing, whose URL replaces (and canonicalizes) the visited one. */
  private visiting?: ScreenTarget;
  /** Bumped per visit, so only the latest of overlapping visits gets shown. */
  private visits = 0;
  private transition: Promise<void> = Promise.resolve();

  /** Take over the URL and show the screen it points at. */
  public start(navigation: Navigation): Promise<void> {
    this.stop();
    this.navigation = navigation;
    const unsubscribe = navigation.onScreenChange((screen, props) => this.write(screen, props));
    window.addEventListener('popstate', this.onPopState);
    this.unsubscribe = () => {
      unsubscribe();
      window.removeEventListener('popstate', this.onPopState);
    };
    return this.visit(readLocation());
  }

  public stop() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /**
   * Go to an in-app href, such as the page a visitor was on before being sent to log in.
   * Guards and loaders run as for any visit. Leaving a transient screen replaces its entry.
   */
  public open(href: string): Promise<void> {
    const location = parseHref(href);
    const url = toBrowserUrl(formatHref(location), BASE);
    if (routeAt(readLocation())?.transient) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    return this.visit(location);
  }

  /** Rewrite the current history entry without showing anything, e.g. to drop a spent link. */
  public replace(href: string) {
    this.href = formatHref(parseHref(href));
    window.history.replaceState(null, '', toBrowserUrl(this.href, BASE));
  }

  /** Show the current URL again, e.g. after a failed catalog fetch succeeds on retry. */
  public reload(): Promise<void> {
    return this.visit(readLocation());
  }

  private readonly onPopState = () => {
    const location = readLocation();
    if (formatHref(location) === this.href) return;
    void this.visit(location);
  };

  private visit(location: AppLocation): Promise<void> {
    const visit = ++this.visits;
    this.href = formatHref(location);

    // One transition at a time: rapid Back presses settle on the last URL, not a mix. Guards
    // and loaders run in turn too, and not at all for a visit a later one has overtaken.
    this.transition = this.transition.then(async () => {
      if (visit !== this.visits) return;
      try {
        const screen = await this.resolve(location);
        if (visit === this.visits) await this.show(screen);
      } catch (error) {
        console.error(`[router] Could not open ${formatHref(location)}`, error);
      }
    });
    return this.transition;
  }

  private async resolve(location: AppLocation): Promise<ScreenTarget> {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const route = routeAt(location);
      const params = route?.match(location);
      const outcome =
        route && params ? await route.resolve(params, formatHref(location)) : undefined;

      if (outcome instanceof Redirect) {
        location = parseHref(outcome.href);
        continue;
      }
      if (outcome) return outcome;
      // Unknown URL, or one naming something the catalog no longer has.
      location = parseHref(fallback.href());
    }
    throw new Error(`Too many redirects, last to ${formatHref(location)}`);
  }

  private async show(target: ScreenTarget) {
    const navigation = this.navigation!;
    // Leaving a screen through history closes whatever was open over it.
    if (useOverlayStore.getState().activeOverlay === 'menu') useOverlayStore.getState().hide();
    await navigation.hideAllPopups();

    this.visiting = target;
    try {
      await navigation.showScreen(target.screen as AppScreenConstructor<[unknown]>, target.props);
    } finally {
      this.visiting = undefined;
    }
  }

  /** Mirror a screen change into the address bar. */
  private write(screen: AnyScreen, props: unknown) {
    const href = this.hrefFor(screen, props);
    if (href === undefined) return;

    const current = readLocation();
    const fromVisit = this.visiting?.screen === screen && this.visiting.props === props;
    this.href = href;
    if (href === formatHref(current)) return;

    // A visit already has its history entry and only canonicalizes it. Anything else is a new
    // step, unless the screen being left is a transient one.
    const replace = fromVisit || routeAt(current)?.transient;
    const url = toBrowserUrl(href, BASE);
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  }

  private hrefFor(screen: AnyScreen, props: unknown): string | undefined {
    for (const route of routes) {
      const href = route.hrefFor(screen, props);
      if (href !== undefined) return href;
    }
    if (import.meta.env.DEV && !routelessScreens.has(screen)) {
      console.warn(`[router] ${screen.name} has no route; add one in src/router/routes.ts`);
    }
  }
}

export const router = new Router();
