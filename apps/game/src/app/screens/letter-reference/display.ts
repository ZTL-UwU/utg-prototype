import { Assets, Container, Graphics, GraphicsContext } from 'pixi.js';

import type { LETTER_FORMS } from '.';

/** Uniform stroke width of every outline SVG. Graphics bounds exclude the stroke. */
const STROKE_WIDTH = 0.8;
/** Fraction of the display box a glyph fills on its constrained axis. */
const FIT_FRACTION = 0.7;
/** Vertical space kept clear at the top for the HUD buttons. */
const TOP_INSET = 180;
/** Education letters are spelled with a leading hamza that the outline folders drop. */
const HAMZA = '\u0626';

const contextCache = new Map<string, GraphicsContext>();

function outlineAssetKey(letter: string, form: LETTER_FORMS) {
  const base = letter.length > 1 && letter.startsWith(HAMZA) ? letter.slice(1) : letter;
  return `letter-reference/${base}/${form}.svg`;
}

/**
 * Loads an outline as a vector GraphicsContext so it stays crisp however far it is scaled up —
 * the SVGs are authored around 23 units wide and get blown up ~30x.
 *
 * Deliberately bypasses `Assets.load`: the loader caches by URL alone and the engine
 * background-loads every bundle, so these aliases are likely already cached as raster textures.
 */
async function loadOutlineContext(key: string) {
  const cached = contextCache.get(key);
  if (cached) return cached;

  const response = await fetch(Assets.resolver.resolveUrl(key) as string);
  if (!response.ok) throw new Error(`Letter outline ${key} not found (${response.status})`);

  const context = new GraphicsContext().svg(await response.text());
  contextCache.set(key, context);
  return context;
}

export class OutlineDisplay extends Container {
  /** Scaled and centred by hand, so the outline itself stays in artboard units. */
  private frame = new Container();
  private outline = new Graphics();
  private boxWidth = 0;
  private boxHeight = 0;
  private glyphWidth = 0;
  private glyphHeight = 0;

  constructor(letter: string, form: LETTER_FORMS = 'isolated') {
    super({ layout: { position: 'absolute', width: '100%', height: '100%' } });

    this.frame.addChild(this.outline);
    this.addChild(this.frame);

    void this.setLetter(letter, form);
  }

  async setLetter(letter: string, form: LETTER_FORMS = 'isolated') {
    const key = outlineAssetKey(letter, form);

    let context: GraphicsContext;
    try {
      context = await loadOutlineContext(key);
    } catch (error) {
      // Not every letter has every form: non-connecting letters only have final and isolated.
      console.warn(error);
      return;
    }
    this.outline.context = context;

    // Pixi's SVG parser ignores viewBox, so the glyph sits at its master artboard coordinates.
    const bounds = this.outline.getLocalBounds();
    this.outline.position.set(-bounds.x, -bounds.y);
    this.glyphWidth = bounds.width + STROKE_WIDTH;
    this.glyphHeight = bounds.height + STROKE_WIDTH;

    this.applyFit();
  }

  resize(width: number, height: number) {
    this.boxWidth = width;
    this.boxHeight = height;
    this.applyFit();
  }

  /** Contains the glyph in the box preserving its aspect ratio, then centres it below the HUD. */
  private applyFit() {
    // The load and the first resize race, so wait until both have landed.
    if (!this.boxWidth || !this.boxHeight || !this.glyphWidth || !this.glyphHeight) return;

    const scale = Math.min(
      (this.boxWidth * FIT_FRACTION) / this.glyphWidth,
      (this.boxHeight * FIT_FRACTION) / this.glyphHeight,
    );

    this.frame.scale.set(scale);
    this.frame.position.set(
      Math.round((this.boxWidth - this.glyphWidth * scale) / 2),
      Math.round((this.boxHeight - this.glyphHeight * scale) / 2 + TOP_INSET / 2),
    );
  }
}
