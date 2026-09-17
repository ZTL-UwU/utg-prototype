import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { encodeFeedbackImage, submitFeedbackDemo } from './feedback';

afterEach(() => vi.unstubAllGlobals());

describe('feedback demo', () => {
  it('round-trips the description and image through multipart without a network call', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const image = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    const receipt = await submitFeedbackDemo('  A misplaced letter  ', image);
    expect(receipt.description).toBe('A misplaced letter');
    expect(receipt.image.name).toBe('feedback.png');
    expect(receipt.image.type).toBe('image/png');
    expect(await receipt.image.arrayBuffer()).toEqual(await image.arrayBuffer());
    expect(receipt.requestBytes).toBeGreaterThan(image.size);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects empty descriptions and invalid images', async () => {
    const image = new Blob(['png'], { type: 'image/png' });
    await expect(submitFeedbackDemo('  ', image)).rejects.toThrow('describe');
    await expect(submitFeedbackDemo('test', new Blob())).rejects.toThrow('PNG');
    await expect(
      submitFeedbackDemo('test', new Blob(['jpeg'], { type: 'image/jpeg' })),
    ).rejects.toThrow('PNG');
  });

  it('reports failed canvas encoding', async () => {
    const canvas = { toBlob: (callback: BlobCallback) => callback(null) } as HTMLCanvasElement;
    await expect(encodeFeedbackImage(canvas)).rejects.toThrow('encode');
  });
});
