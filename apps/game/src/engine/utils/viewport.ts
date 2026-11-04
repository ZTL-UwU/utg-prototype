/** Tailwind's default breakpoints, so `md` here and `md:` in a class name change together. */
const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

type ResponsiveValues<T> = { sm: T; md?: T; lg?: T; xl?: T };

/**
 * Tailwind-style breakpoints for Pixi code: `responsive({ sm: 100, md: 200, lg: 300 })`.
 *
 * Mobile-first, like the classes: the largest breakpoint the window has reached wins, and an
 * omitted one inherits from the size below it. `sm` also covers everything narrower, so phones
 * read it. Reads the window on each call, so use it inside `resize` to follow size changes.
 */
export function responsive<T>(values: ResponsiveValues<T>): T {
  const width = window.innerWidth;
  let value = values.sm;
  for (const breakpoint of ['md', 'lg', 'xl'] as const) {
    const candidate = values[breakpoint];
    if (candidate !== undefined && width >= BREAKPOINTS[breakpoint]) value = candidate;
  }
  return value;
}

let safeAreaProbe: HTMLElement | undefined;

/** Notch and home indicator insets in CSS pixels, resolved from `.safe-area-probe`. */
export function safeAreaInsets() {
  if (!safeAreaProbe) {
    safeAreaProbe = document.createElement('div');
    safeAreaProbe.className = 'safe-area-probe';
    document.body.appendChild(safeAreaProbe);
  }

  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = getComputedStyle(safeAreaProbe);
  return {
    top: parseFloat(paddingTop),
    right: parseFloat(paddingRight),
    bottom: parseFloat(paddingBottom),
    left: parseFloat(paddingLeft),
  };
}
