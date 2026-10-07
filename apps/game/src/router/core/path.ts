/** Names of the `:param` segments in a route pattern: `'/:layer/maps/:mapId'` → `'layer' | 'mapId'`. */
export type ParamNames<Pattern extends string> =
  Pattern extends `${string}:${infer Name}/${infer Rest}`
    ? Name | ParamNames<`/${Rest}`>
    : Pattern extends `${string}:${infer Name}`
      ? Name
      : never;

/**
 * Params read from a URL: the pattern's path params are always present, query params may be.
 * A route sees both through the same object, so `?map=3` reads as `params.map`.
 */
export type RouteParams<Pattern extends string> = Readonly<Record<ParamNames<Pattern>, string>> &
  Readonly<Partial<Record<string, string>>>;

/** Values to build a URL from. Keys the pattern does not name go to the query string. */
export type HrefValues<Pattern extends string> = Record<ParamNames<Pattern>, string | number> &
  Partial<Record<string, string | number>>;

/** An in-app location, independent of the deploy base path. */
export type AppLocation = {
  /** Normalized path, e.g. `/education/maps/3`. */
  path: string;
  query: URLSearchParams;
};

/** Collapse repeated slashes and drop the trailing one, so `/layers/` and `/layers` are one URL. */
export function normalizePath(path: string): string {
  const collapsed = `/${path}`.replace(/\/{2,}/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/$/, '') : collapsed;
}

function segmentsOf(path: string): string[] {
  return normalizePath(path).split('/').filter(Boolean);
}

export interface PathPattern<Pattern extends string> {
  readonly pattern: Pattern;
  /** Params for a path this pattern matches, merged over the query; undefined otherwise. */
  match(location: AppLocation): RouteParams<Pattern> | undefined;
  /** The href (path and query) for these values. */
  build(values: HrefValues<Pattern>): string;
}

export function compilePath<const Pattern extends string>(pattern: Pattern): PathPattern<Pattern> {
  const parts = segmentsOf(pattern);
  const paramNames = new Set(parts.filter((part) => part.startsWith(':')).map((p) => p.slice(1)));

  return {
    pattern,

    match({ path, query }) {
      const segments = segmentsOf(path);
      if (segments.length !== parts.length) return;

      const params: Record<string, string> = Object.fromEntries(query);
      for (const [index, part] of parts.entries()) {
        const segment = segments[index];
        if (!part.startsWith(':')) {
          if (part !== segment) return;
          continue;
        }
        try {
          params[part.slice(1)] = decodeURIComponent(segment);
        } catch {
          // Malformed escapes like `%E0%A4%A` name nothing we could have built.
          return;
        }
      }
      return params as RouteParams<Pattern>;
    },

    build(values) {
      const path = parts.map((part) => {
        if (!part.startsWith(':')) return part;
        const value = values[part.slice(1)];
        if (value === undefined || value === '') {
          throw new Error(`Missing "${part}" to build ${pattern}`);
        }
        return encodeURIComponent(String(value));
      });

      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(values)) {
        if (!paramNames.has(key) && value !== undefined) query.set(key, String(value));
      }

      const search = query.toString();
      return `/${path.join('/')}${search ? `?${search}` : ''}`;
    },
  };
}

/** Parse an in-app href such as `/reset-password?uid=1&token=x`. */
export function parseHref(href: string): AppLocation {
  const url = new URL(href, 'http://app.invalid');
  return { path: normalizePath(url.pathname), query: url.searchParams };
}

export function formatHref({ path, query }: AppLocation): string {
  const search = query.toString();
  return `${normalizePath(path)}${search ? `?${search}` : ''}`;
}

/**
 * The deploy base without its trailing slash: `''` at the domain root, `'/utg'` when Vite's
 * `base` is `/utg/`. In-app paths never include it; the address bar always does.
 */
function baseRoot(base: string): string {
  return base.replace(/\/+$/, '');
}

/** In-app location for a browser URL served under `base`. */
export function fromBrowserUrl(url: Pick<URL, 'pathname' | 'search'>, base: string): AppLocation {
  const root = baseRoot(base);
  const inBase = root !== '' && (url.pathname === root || url.pathname.startsWith(`${root}/`));
  return {
    path: normalizePath(inBase ? url.pathname.slice(root.length) : url.pathname),
    query: new URLSearchParams(url.search),
  };
}

/** Browser URL (path and query) for an in-app href served under `base`. */
export function toBrowserUrl(href: string, base: string): string {
  return `${baseRoot(base)}${href}`;
}
