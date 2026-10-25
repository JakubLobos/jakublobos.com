import type { Clock } from './clock.ts';

export interface TtlCacheOptions {
  readonly ttlMs: number;
  /** Hard bound so an attacker cannot grow memory by varying keys. */
  readonly maxEntries: number;
  readonly clock: Clock;
}

interface Entry<V> {
  readonly value: V;
  readonly expiresAt: number;
}

/** Bounded in-memory cache with per-entry expiry driven by an injected clock. */
export class TtlCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();
  private readonly options: TtlCacheOptions;

  constructor(options: TtlCacheOptions) {
    if (options.maxEntries < 1 || options.ttlMs < 1) {
      throw new RangeError('TtlCache needs maxEntries >= 1 and ttlMs >= 1');
    }
    this.options = options;
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt <= this.options.clock.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  set(key: K, value: V): void {
    // Re-insert so Map order tracks recency of writes (oldest first).
    this.entries.delete(key);
    if (this.entries.size >= this.options.maxEntries) {
      this.purgeExpired();
    }
    while (this.entries.size >= this.options.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
    this.entries.set(key, { value, expiresAt: this.options.clock.now() + this.options.ttlMs });
  }

  delete(key: K): boolean {
    return this.entries.delete(key);
  }

  get size(): number {
    this.purgeExpired();
    return this.entries.size;
  }

  private purgeExpired(): void {
    const now = this.options.clock.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}
