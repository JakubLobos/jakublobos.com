import { PAINT_IDS } from '@portfolio/contracts';
import { describe, expect, it } from 'vitest';
import { isPaintId } from './guestbook-paint.ts';

describe('isPaintId', () => {
  it('recognizes exactly the contract paint IDs', () => {
    for (const id of PAINT_IDS) expect(isPaintId(id)).toBe(true);
    expect(isPaintId('green')).toBe(false);
    expect(isPaintId(undefined)).toBe(false);
  });
});
