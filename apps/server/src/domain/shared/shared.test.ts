import { describe, expect, it } from 'vitest';
import { FakeClock, systemClock } from './clock.ts';
import { createSequentialIds, uuidGenerator } from './ids.ts';
import { err, ok } from './result.ts';
import { TtlCache } from './ttl-cache.ts';

describe('FakeClock', () => {
  it('only moves when told to', () => {
    const clock = new FakeClock(1000);
    expect(clock.now()).toBe(1000);
    clock.advance(500);
    expect(clock.now()).toBe(1500);
    clock.set(7);
    expect(clock.now()).toBe(7);
  });

  it('systemClock tracks real time', () => {
    expect(Math.abs(systemClock.now() - Date.now())).toBeLessThan(1000);
  });
});

describe('ids', () => {
  it('sequential ids are predictable', () => {
    const ids = createSequentialIds('x');
    expect([ids.next(), ids.next()]).toEqual(['x-1', 'x-2']);
  });

  it('uuid generator yields unique v4-shaped ids', () => {
    const a = uuidGenerator.next();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidGenerator.next()).not.toBe(a);
  });
});

describe('result', () => {
  it('discriminates on ok', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
  });
});

describe('TtlCache', () => {
  it('expires entries by the injected clock', () => {
    const clock = new FakeClock(0);
    const cache = new TtlCache<string, number>({ ttlMs: 100, maxEntries: 10, clock });
    cache.set('a', 1);
    clock.advance(99);
    expect(cache.get('a')).toBe(1);
    clock.advance(1);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('is bounded: evicts the oldest entry when full', () => {
    const cache = new TtlCache<string, number>({
      ttlMs: 1000,
      maxEntries: 2,
      clock: new FakeClock(),
    });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.has('a')).toBe(false);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('prefers evicting expired entries over live ones', () => {
    const clock = new FakeClock(0);
    const cache = new TtlCache<string, number>({ ttlMs: 100, maxEntries: 2, clock });
    cache.set('old', 1);
    clock.advance(60);
    cache.set('young', 2);
    clock.advance(50);
    cache.set('new', 3);
    expect(cache.get('young')).toBe(2);
    expect(cache.get('new')).toBe(3);
  });

  it('refreshes ttl on overwrite and supports delete', () => {
    const clock = new FakeClock(0);
    const cache = new TtlCache<string, number>({ ttlMs: 100, maxEntries: 2, clock });
    cache.set('a', 1);
    clock.advance(90);
    cache.set('a', 2);
    clock.advance(90);
    expect(cache.get('a')).toBe(2);
    expect(cache.delete('a')).toBe(true);
    expect(cache.get('a')).toBeUndefined();
  });

  it('rejects nonsensical options', () => {
    expect(() => new TtlCache({ ttlMs: 0, maxEntries: 1, clock: new FakeClock() })).toThrow(
      RangeError,
    );
  });
});
