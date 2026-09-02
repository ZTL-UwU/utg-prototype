import { Assets, Texture } from 'pixi.js';

export const POSTCARD_ROOT = 'typing-levels/postcards';

/** Whether this browser can put an image on the clipboard at all. */
export function canCopyImages(): boolean {
  return typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
}

/**
 * The postcard front as an `image/png` blob.
 *
 * `image/png` is the only image type every clipboard implementation accepts, but the asset alias
 * resolves to the WebP on any modern browser — the alias is a key, not a file. So we ask the
 * resolver for the URL (which carries the configured base path) and rewrite it onto the PNG
 * sibling that AssetPack emits alongside it.
 */
export async function loadFrontPng(slug: string): Promise<Blob> {
  const alias = `${POSTCARD_ROOT}/${slug}/front.png`;

  // `resolveUrl` is typed for its array overload as well; one key always yields one URL.
  const resolved = Assets.resolver.resolveUrl(alias) as string;

  // Dropping any `@0.5x` keeps this on the full-size art even if a texture resolution
  // preference is set on `Assets.init` later.
  const url = resolved.replace(/(@[\d.]+x)?\.(webp|png)$/i, '.png');

  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      if (blob.type === 'image/png') return blob;
    }
  } catch {
    // Fall through and re-encode instead.
  }

  return encodeTextureAsPng(alias);
}

/** Re-encode the decoded texture, for when no PNG sibling is served next to the WebP. */
async function encodeTextureAsPng(alias: string): Promise<Blob> {
  const source = Texture.from(alias).source;
  const image = source.resource as CanvasImageSource | null;
  if (!image) throw new Error(`No decoded image behind ${alias}`);

  const canvas = document.createElement('canvas');
  canvas.width = source.pixelWidth;
  canvas.height = source.pixelHeight;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('No 2d context for PNG encoding');
  context.drawImage(image, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding produced no blob'))),
      'image/png',
    );
  });
}
