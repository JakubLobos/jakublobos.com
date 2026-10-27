import { describe, expect, it } from 'vitest';
import { wouldOverflow } from './input-limit.ts';

const base = { maxLength: 10, valueLength: 10, selectionLength: 0, insertLength: 1 };

describe('wouldOverflow', () => {
  it('flags an insert into a full control', () => {
    expect(wouldOverflow(base)).toBe(true);
  });

  it('allows an insert that fits exactly', () => {
    expect(wouldOverflow({ ...base, valueLength: 9 })).toBe(false);
  });

  it('flags an insert that overflows by one', () => {
    expect(wouldOverflow({ ...base, valueLength: 9, insertLength: 2 })).toBe(true);
  });

  it('allows replacing a selection when the result still fits', () => {
    expect(wouldOverflow({ ...base, selectionLength: 3, insertLength: 3 })).toBe(false);
  });

  it('flags a replacement longer than its selection plus the room left', () => {
    expect(wouldOverflow({ ...base, selectionLength: 3, insertLength: 4 })).toBe(true);
  });

  it('never flags a control without maxLength', () => {
    expect(wouldOverflow({ ...base, maxLength: -1, insertLength: 1000 })).toBe(false);
  });
});
