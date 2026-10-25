import { describe, expect, it } from 'vitest';
import { nextAttemptDelay } from './backoff.ts';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe('nextAttemptDelay', () => {
  it.each([
    [0, 30 * SECOND],
    [1, 2 * MINUTE],
    [2, 10 * MINUTE],
    [3, 30 * MINUTE],
    [4, HOUR],
    [5, 2 * HOUR],
    [40, 2 * HOUR],
  ])('after %i failures waits %i ms', (attempts, expected) => {
    expect(nextAttemptDelay(attempts)).toBe(expected);
  });

  it('respects a longer Retry-After and ignores a shorter or invalid one', () => {
    expect(nextAttemptDelay(0, 600)).toBe(10 * MINUTE);
    expect(nextAttemptDelay(2, 5)).toBe(10 * MINUTE);
    expect(nextAttemptDelay(0, 0)).toBe(30 * SECOND);
    expect(nextAttemptDelay(0, Number.NaN)).toBe(30 * SECOND);
  });

  it('caps an absurd Retry-After at the longest step', () => {
    expect(nextAttemptDelay(0, 10 * 24 * 3600)).toBe(2 * HOUR);
  });
});
