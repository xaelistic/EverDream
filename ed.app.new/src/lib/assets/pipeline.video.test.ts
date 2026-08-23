import { describe, expect, it } from 'vitest';
import { hydrateDrawableUrl } from './pipeline';

describe('hydrateDrawableUrl', () => {
  it('passes through data and blob URLs', async () => {
    const data = 'data:image/png;base64,aaaa';
    expect(await hydrateDrawableUrl(data)).toBe(data);
    const blob = 'blob:https://everdream.n1g3.com/abc';
    expect(await hydrateDrawableUrl(blob)).toBe(blob);
  });

  it('rejects empty urls', async () => {
    await expect(hydrateDrawableUrl('')).rejects.toThrow(/Missing image/);
  });
});
