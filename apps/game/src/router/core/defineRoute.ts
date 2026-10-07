import type { AppScreenConstructor } from '../../engine/navigation/navigation';
import {
  compilePath,
  type AppLocation,
  type HrefValues,
  type ParamNames,
  type RouteParams,
} from './path';

type MaybePromise<T> = T | Promise<T>;

export type AnyScreen = AppScreenConstructor<any[]>;

/** A screen to show and the props for its constructor. */
export type ScreenTarget = { screen: AnyScreen; props?: unknown };

/** Send the visit to another URL. The router resolves it from scratch, guards included. */
export class Redirect {
  public readonly href: string;

  constructor(href: string) {
    this.href = href;
  }
}

export function redirect(href: string): Redirect {
  return new Redirect(href);
}

/**
 * Runs before a route loads, given the href being visited. Return nothing to let the visit
 * through, a {@link Redirect} to send it elsewhere, or a screen to show in its place while the
 * address bar keeps the URL (an error state, so a refresh retries the same URL).
 */
export type Guard = (href: string) => MaybePromise<Redirect | ScreenTarget | void>;

/** A route that shows one of several screens, picked from its props, such as every level type. */
export type ScreenChoice<P> = {
  readonly screens: readonly AppScreenConstructor<[P]>[];
  readonly pick: (props: P) => AppScreenConstructor<[P]> | undefined;
};

export function oneOf<P>(
  screens: Iterable<AppScreenConstructor<[P]>>,
  pick: ScreenChoice<P>['pick'],
): ScreenChoice<P> {
  return { screens: [...screens], pick };
}

type RouteOptions<Path extends string> = {
  /** URL pattern. `:name` segments are params; numbers in them are ids. */
  path: Path;
  /** Checked in order before the route loads. The first one that objects wins. */
  guards?: readonly Guard[];
  /**
   * Leaving this screen replaces its history entry instead of stacking another, so Back
   * never reopens a finished flow (login) or restarts a level the player already left.
   */
  transient?: boolean;
};

type ScreenRouteOptions<Path extends string> = RouteOptions<Path> & {
  screen: AppScreenConstructor;
};

type PropsRouteOptions<Path extends string, P> = RouteOptions<Path> & {
  screen: AppScreenConstructor<[P]> | ScreenChoice<P>;
  /**
   * URL → screen props. Return nothing when the URL names something that does not exist
   * (the visit falls back home), or a {@link Redirect}.
   */
  load: (params: RouteParams<Path>) => MaybePromise<NoInfer<P> | Redirect | null | undefined>;
  /**
   * Screen props → URL params, or nothing when this route cannot show these props (another
   * route for the same screen may). Keys the path does not name go to the query string.
   */
  params: (props: NoInfer<P>) => HrefValues<Path> | undefined;
};

/** Routes without path params build their href with no arguments. */
type HrefArgs<Path extends string> = [ParamNames<Path>] extends [never]
  ? [values?: HrefValues<Path>]
  : [values: HrefValues<Path>];

export interface Route<Path extends string = string> {
  readonly path: Path;
  readonly transient: boolean;
  /** The href for these values, for links and redirects. */
  href(...values: HrefArgs<Path>): string;
  /** @internal Params for a location this route matches. */
  match(location: AppLocation): RouteParams<Path> | undefined;
  /** @internal URL → screen, running guards first. Undefined when the URL names nothing. */
  resolve(params: RouteParams<Path>, href: string): Promise<ScreenTarget | Redirect | undefined>;
  /** @internal Screen → href, or undefined when this route does not show it. */
  hrefFor(screen: AnyScreen, props: unknown): string | undefined;
}

// The props overload goes first: TypeScript fixes `load`'s parameter type on the first overload
// it tries, and a screen whose props are optional would also fit the no-props one.
/** A screen built from props the URL identifies, such as a map or level by id. */
export function defineRoute<const Path extends string, P>(
  options: PropsRouteOptions<Path, P>,
): Route<Path>;
/** A screen that takes no props: the URL alone identifies it. */
export function defineRoute<const Path extends string>(
  options: ScreenRouteOptions<Path>,
): Route<Path>;
export function defineRoute<const Path extends string, P>(
  options: ScreenRouteOptions<Path> | PropsRouteOptions<Path, P>,
): Route<Path> {
  const { path, guards = [], transient = false } = options;
  const pattern = compilePath(path);
  const props = 'load' in options ? options : undefined;
  const choice = isChoice(options.screen) ? options.screen : undefined;
  const screens: readonly AnyScreen[] = choice ? choice.screens : [options.screen as AnyScreen];

  return {
    path,
    transient,
    href: (...[values]) => pattern.build(values ?? ({} as HrefValues<Path>)),
    match: (location) => pattern.match(location),

    async resolve(params, href) {
      for (const guard of guards) {
        const outcome = await guard(href);
        if (outcome) return outcome;
      }

      if (!props) return { screen: options.screen as AnyScreen };

      const loaded = await props.load(params);
      if (loaded instanceof Redirect) return loaded;
      if (loaded == null) return;

      const screen = choice ? choice.pick(loaded) : (options.screen as AnyScreen);
      return screen ? { screen, props: loaded } : undefined;
    },

    hrefFor(screen, screenProps) {
      if (!screens.includes(screen)) return;
      if (!props) return pattern.build({} as HrefValues<Path>);
      // The screen constructor's type is what pairs it with `P` at every `showScreen` call.
      const values = props.params(screenProps as P);
      return values && pattern.build(values);
    },
  };
}

function isChoice<P>(screen: AnyScreen | ScreenChoice<P>): screen is ScreenChoice<P> {
  return 'pick' in screen;
}

/** A positive integer id from a URL param, or undefined for anything else. */
export function parseId(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}
