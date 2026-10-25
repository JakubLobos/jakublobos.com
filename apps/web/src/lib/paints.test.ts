import { PAINT_IDS } from '@portfolio/contracts';
import { describe, expect, it } from 'vitest';
import { PAINT_ORDER, PAINTS } from './paints.ts';

describe('paints', () => {
  it('covers exactly the contract paint IDs, in order', () => {
    expect(PAINT_ORDER).toEqual(PAINT_IDS);
    expect(Object.keys(PAINTS).sort()).toEqual([...PAINT_IDS].sort());
  });

  it('derives variable and label names from the ID', () => {
    for (const id of PAINT_IDS) {
      expect(PAINTS[id]).toEqual({
        swatchVar: `--paint-${id}`,
        tintVar: `--paint-${id}-tint`,
        labelKey: `guestbook.paint.${id}`,
      });
    }
  });
});
