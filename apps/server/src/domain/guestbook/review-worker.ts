import { TtlCache } from '../shared/ttl-cache.ts';
import type { Clock } from '../shared/clock.ts';
import { nextAttemptDelay } from './backoff.ts';
import { generalReason } from './rejection-reason.ts';
import type { ReviewPipeline } from './review-pipeline.ts';
import type { GuestbookRepository } from './repository.port.ts';

/** The slice of pino the guestbook uses; structural so `domain/` does not import it. */
export interface GuestbookLogger {
  info(fields: object, message?: string): void;
  warn(fields: object, message?: string): void;
  error(fields: object, message?: string): void;
}

export interface Scheduler {
  /** Runs `run` every `intervalMs` until the returned function is called. */
  every(intervalMs: number, run: () => void): () => void;
}

export const intervalScheduler: Scheduler = {
  every(intervalMs, run) {
    const timer = setInterval(run, intervalMs);
    // The worker must never keep the process alive on its own.
    timer.unref();
    return () => {
      clearInterval(timer);
    };
  },
};

/** Content hashes of recently rejected texts, so a resubmission is dropped without a review. */
export interface RecentRejections {
  add(contentHash: string): void;
  has(contentHash: string): boolean;
}

const REJECTION_TTL_MS = 60 * 60 * 1000;
// Bounded so a flood of distinct rejected texts cannot grow memory (daily cap is 50 anyway).
const REJECTION_MAX_ENTRIES = 500;

export function createRecentRejections(clock: Clock): RecentRejections {
  const cache = new TtlCache<string, true>({
    ttlMs: REJECTION_TTL_MS,
    maxEntries: REJECTION_MAX_ENTRIES,
    clock,
  });
  return {
    add: (contentHash) => {
      cache.set(contentHash, true);
    },
    has: (contentHash) => cache.has(contentHash),
  };
}

export interface ReviewWorker {
  /** Runs a tick now and then on the interval. */
  start(): void;
  /** Stops the interval and waits for the in-flight review to finish. */
  stop(): Promise<void>;
  /** A new message arrived: review it as soon as the current tick (if any) ends. */
  nudge(): void;
  /** One expire, find, review, apply pass. Resolves when no rerun is pending. */
  tick(): Promise<void>;
}

export interface ReviewWorkerDeps {
  readonly repo: GuestbookRepository;
  readonly pipeline: ReviewPipeline;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly logger: GuestbookLogger;
  readonly recentRejections: RecentRejections;
  readonly intervalMs?: number;
}

export const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 15_000;

export function createReviewWorker(deps: ReviewWorkerDeps): ReviewWorker {
  const { repo, pipeline, clock, scheduler, logger, recentRejections } = deps;
  let cancelInterval: (() => void) | null = null;
  let running: Promise<void> | null = null;
  let rerun = false;
  let stopped = false;

  async function reviewOnce(): Promise<void> {
    const expired = repo.deleteExpiredPending(clock.now() - PENDING_TTL_MS);
    if (expired > 0) logger.info({ event: 'expired', count: expired }, 'guestbook pending expired');

    const row = repo.findDuePending(clock.now());
    if (row === null) return;

    const decision = await pipeline.reviewMessage({ body: row.body, locale: row.locale });
    // Everything below acts on `row.id`, so a row superseded or expired during the (slow)
    // review makes each repository call a no-op instead of touching the newer message.
    switch (decision.kind) {
      case 'approve':
        if (repo.approve(row.id, clock.now())) {
          logger.info({ event: 'approved', attempts: row.attempts }, 'guestbook message approved');
        } else {
          logger.info({ event: 'stale_result', outcome: 'approve' }, 'guestbook result discarded');
        }
        return;
      case 'reject':
        // Remembered even if the row is already gone: the text itself failed review.
        recentRejections.add(row.contentHash);
        logger.info(
          { event: 'rejected', layer: decision.layer, reason: decision.reason },
          'guestbook message rejected',
        );
        if (!repo.rejectPending(row.id, generalReason(decision), clock.now())) {
          logger.info({ event: 'stale_result', outcome: 'reject' }, 'guestbook result discarded');
        }
        return;
      case 'transient': {
        const delayMs = nextAttemptDelay(row.attempts, decision.retryAfterSeconds);
        repo.recordFailure(row.id, decision.code, clock.now() + delayMs);
        logger.warn(
          { event: 'retry_scheduled', code: decision.code, attempts: row.attempts + 1, delayMs },
          'guestbook review will be retried',
        );
        return;
      }
    }
  }

  // A function, so the compiler does not narrow `rerun` to false across the await below.
  const shouldRerun = (): boolean => rerun && !stopped;

  async function safeReviewOnce(): Promise<void> {
    try {
      await reviewOnce();
    } catch (error) {
      // Repository failures only; messages carry no text, and the next tick tries again.
      logger.error({ event: 'review_error', err: error }, 'guestbook review failed');
    }
  }

  function tick(): Promise<void> {
    if (running !== null) {
      // The in-flight pass may predate the message that triggered this call.
      rerun = true;
      return running;
    }
    const pass = (async () => {
      try {
        do {
          rerun = false;
          await safeReviewOnce();
        } while (shouldRerun());
      } finally {
        // Cleared in the same synchronous step as the rerun check, so a nudge can never
        // land between "no rerun wanted" and "no longer running" and be lost.
        running = null;
      }
    })();
    running = pass;
    return pass;
  }

  return {
    start() {
      if (cancelInterval !== null || stopped) return;
      cancelInterval = scheduler.every(deps.intervalMs ?? DEFAULT_INTERVAL_MS, () => {
        void tick();
      });
      void tick();
    },
    async stop() {
      stopped = true;
      cancelInterval?.();
      cancelInterval = null;
      await running;
    },
    nudge() {
      if (!stopped) void tick();
    },
    tick,
  };
}
