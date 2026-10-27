import request from 'supertest';
import {
  createGuestbookService,
  type GuestbookSubmission,
} from '../../src/domain/guestbook/guestbook.service.ts';
import type {
  ModerationOutcome,
  ModerationProvider,
} from '../../src/domain/guestbook/moderation.port.ts';
import { createReviewPipeline } from '../../src/domain/guestbook/review-pipeline.ts';
import {
  createRecentRejections,
  createReviewWorker,
  type Scheduler,
} from '../../src/domain/guestbook/review-worker.ts';
import type {
  SuitabilityOutcome,
  SuitabilityReviewer,
} from '../../src/domain/guestbook/suitability.port.ts';
import { FakeClock } from '../../src/domain/shared/clock.ts';
import { uuidGenerator } from '../../src/domain/shared/ids.ts';
import {
  createGuestbookCap,
  createGuestbookRoutes,
} from '../../src/http/routes/guestbook.routes.ts';
import { sha256Hasher } from '../../src/infra/crypto/sha256.hasher.ts';
import { createGuestbookRepository } from '../../src/infra/db/guestbook.repository.ts';
import { createTestDb } from '../../src/infra/db/test-db.ts';
import { createLogger } from '../../src/logger.ts';
import { ALLOWED_ORIGIN, buildTestApp, createLogCapture } from '../../src/test-support/test-app.ts';

export const START_TIME = Date.UTC(2026, 9, 25, 12, 0, 0);
export const SCORE_THRESHOLD = 0.2;

export const CLEAN_SCORES: ModerationOutcome = {
  kind: 'ok',
  flagged: false,
  categories: { harassment: false },
  scores: { harassment: 0 },
};

type Behavior<T> = T | (() => T | Promise<T>);

/** A provider whose answer the test sets, recording the text of every call. */
function createStub<T extends object>(initial: Behavior<T>) {
  let behavior = initial;
  const calls: string[] = [];
  return {
    calls,
    set(next: Behavior<T>): void {
      behavior = next;
    },
    async answer(text: string): Promise<T> {
      calls.push(text);
      return typeof behavior === 'function' ? await behavior() : behavior;
    },
  };
}

/** Time never passes on its own: the test fires the interval by hand. */
export function createManualScheduler(): Scheduler & { fire(): void; readonly active: number } {
  const handlers = new Set<() => void>();
  return {
    every(_intervalMs, run) {
      handlers.add(run);
      return () => {
        handlers.delete(run);
      };
    },
    fire() {
      for (const run of [...handlers]) run();
    },
    get active() {
      return handlers.size;
    },
  };
}

export function buildGuestbookTestApp(options: { clientIpSource?: 'socket' | 'x-real-ip' } = {}) {
  const clock = new FakeClock(START_TIME);
  const db = createTestDb();
  const repo = createGuestbookRepository(db);
  const capture = createLogCapture();
  const logger = createLogger({ level: 'info', destination: capture.stream });

  const moderationStub = createStub<ModerationOutcome>(CLEAN_SCORES);
  const suitabilityStub = createStub<SuitabilityOutcome>({
    kind: 'ok',
    verdict: 'approve',
    reason: 'ok',
  });
  const moderation: ModerationProvider = { moderate: (text) => moderationStub.answer(text) };
  const suitability: SuitabilityReviewer = { review: (text) => suitabilityStub.answer(text) };

  const scheduler = createManualScheduler();
  const recentRejections = createRecentRejections(clock);
  const worker = createReviewWorker({
    repo,
    pipeline: createReviewPipeline({
      moderation,
      suitability,
      moderationThreshold: SCORE_THRESHOLD,
    }),
    clock,
    scheduler,
    logger,
    recentRejections,
  });
  const service = createGuestbookService({
    repo,
    worker,
    hasher: sha256Hasher,
    ids: uuidGenerator,
    clock,
    cap: createGuestbookCap(clock),
    recentRejections,
  });
  const { app } = buildTestApp({
    logger,
    routes: [
      createGuestbookRoutes({ service, clientIpSource: options.clientIpSource ?? 'socket' }),
    ],
  });

  return {
    app,
    db,
    repo,
    clock,
    worker,
    scheduler,
    service,
    recentRejections,
    /** Submits through the service directly (HTTP limits are covered in the routes tests). */
    submit: (overrides: Record<string, unknown> = {}) =>
      service.submit(submission(overrides) as GuestbookSubmission, { log: logger }),
    logs: capture.text,
    moderation: moderationStub,
    suitability: suitabilityStub,
    post: (body: unknown, ip?: string) => {
      const req = request(app).post('/api/guestbook').set('Origin', ALLOWED_ORIGIN);
      return (ip === undefined ? req : req.set('X-Real-IP', ip)).send(body as object);
    },
    status: (token: string, ip?: string) => {
      const req = request(app).get(`/api/guestbook/submissions/${token}`);
      return ip === undefined ? req : req.set('X-Real-IP', ip);
    },
    latest: (etag?: string) => {
      const req = request(app).get('/api/guestbook/latest');
      return etag === undefined ? req : req.set('If-None-Match', etag);
    },
  };
}

export type GuestbookTestApp = ReturnType<typeof buildGuestbookTestApp>;

let sequence = 0;

/** A valid submission body with a fresh `clientRequestId` unless told otherwise. */
export function submission(overrides: Record<string, unknown> = {}) {
  sequence += 1;
  const suffix = String(sequence).padStart(12, '0');
  return {
    body: 'Lovely portfolio, nice work',
    paint: 'violet',
    clientRequestId: `00000000-0000-4000-8000-${suffix}`,
    locale: 'en',
    website: '',
    ...overrides,
  };
}

/** Lets already-resolved promises and the worker's pending microtasks run. */
export const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
