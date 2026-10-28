import { describe, expect, it } from 'vitest';
import { placeCopyTag } from './copy-tag-position.ts';

const tag = { width: 100, height: 30 };
const viewport = { width: 800, height: 600 };

describe('placeCopyTag', () => {
  it('centres the tag above the anchor', () => {
    const anchor = { left: 300, top: 200, width: 200, height: 20 };
    expect(placeCopyTag(anchor, tag, viewport)).toEqual({ left: 350, top: 160, side: 'above' });
  });

  it('flips below when there is no room above', () => {
    const anchor = { left: 300, top: 20, width: 200, height: 20 };
    expect(placeCopyTag(anchor, tag, viewport)).toEqual({ left: 350, top: 50, side: 'below' });
  });

  it('keeps the tag inside the viewport at the right edge', () => {
    const anchor = { left: 790, top: 300, width: 10, height: 100 };
    expect(placeCopyTag(anchor, tag, viewport).left).toBe(692);
  });

  it('keeps the tag inside the viewport at the left edge', () => {
    const anchor = { left: 0, top: 300, width: 10, height: 20 };
    expect(placeCopyTag(anchor, tag, viewport).left).toBe(8);
  });
});
