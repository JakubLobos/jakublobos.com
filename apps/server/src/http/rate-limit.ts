import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { systemClock, type Clock } from '../domain/shared/clock.ts';
import { resolveClientIp, type ClientIpSource } from './client-ip.ts';
import { fail } from './respond.ts';

export interface ClientLimiterOptions {
  readonly windowMs: number;
  readonly limit: number;
  readonly clientIpSource: ClientIpSource;
}

/** Per-client fixed-window limiter, in memory (the API runs as exactly one instance). */
export function createClientLimiter(options: ClientLimiterOptions): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // IPv6 clients get a /56 bucket so rotating within their own prefix doesn't evade the limit.
    keyGenerator: (req) => ipKeyGenerator(resolveClientIp(req, options.clientIpSource), 56),
    // These validations only run inside the default keyGenerator, so our custom one never
    // triggers them. Disabled explicitly so swapping the keyGenerator later can't start
    // warning on every Railway request (X-Forwarded-For present while `trust proxy` is off).
    validate: { trustProxy: false, xForwardedForHeader: false },
    handler: (_req, res) => {
      const reset = Number(res.getHeader('Retry-After'));
      fail(res, {
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        retryAfterSeconds:
          Number.isFinite(reset) && reset > 0 ? reset : Math.ceil(options.windowMs / 1000),
      });
    },
  });
}

export interface CapWindow {
  readonly windowMs: number;
  readonly limit: number;
}

export type CapResult =
  { readonly ok: true } | { readonly ok: false; readonly retryAfterSeconds: number };

export interface GlobalCap {
  /** Counts one event if every window has room; otherwise counts nothing. */
  consume(): CapResult;
}

interface WindowState {
  start: number;
  count: number;
}

/**
 * Fixed-window global caps (e.g. hourly + daily). Handlers call `consume()` explicitly after
 * validation so rejected requests don't burn the budget.
 */
export function createGlobalCap(options: {
  readonly windows: readonly CapWindow[];
  readonly clock?: Clock;
}): GlobalCap {
  const clock = options.clock ?? systemClock;
  const states: WindowState[] = options.windows.map(() => ({ start: 0, count: 0 }));

  return {
    consume() {
      const now = clock.now();
      let retryAfterMs = 0;
      options.windows.forEach((window, index) => {
        const state = states[index];
        if (state === undefined) return;
        const start = Math.floor(now / window.windowMs) * window.windowMs;
        if (state.start !== start) {
          state.start = start;
          state.count = 0;
        }
        if (state.count >= window.limit) {
          retryAfterMs = Math.max(retryAfterMs, start + window.windowMs - now);
        }
      });
      if (retryAfterMs > 0) {
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
      }
      for (const state of states) state.count += 1;
      return { ok: true };
    },
  };
}
