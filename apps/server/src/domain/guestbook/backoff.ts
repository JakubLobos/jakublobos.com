const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

// 30 s, 2 min, 10 min, 30 min, 1 h, then every 2 h until the 24 h expiry.
const SCHEDULE_MS: readonly number[] = [
  30 * SECOND_MS,
  2 * MINUTE_MS,
  10 * MINUTE_MS,
  30 * MINUTE_MS,
  HOUR_MS,
];
const STEADY_STATE_MS = 2 * HOUR_MS;

/**
 * Delay before the next review attempt. `attempts` counts the failures already recorded, so the
 * first failure passes 0. A provider's Retry-After raises the delay but is capped at the longest
 * step: a bogus header must not park the newest message until it expires.
 */
export function nextAttemptDelay(attempts: number, retryAfterSeconds?: number): number {
  const scheduled = SCHEDULE_MS[Math.max(0, attempts)] ?? STEADY_STATE_MS;
  if (retryAfterSeconds === undefined || !(retryAfterSeconds > 0)) return scheduled;
  return Math.max(scheduled, Math.min(retryAfterSeconds * SECOND_MS, STEADY_STATE_MS));
}
