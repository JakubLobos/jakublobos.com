import { describe, expect, it } from 'vitest';
import {
  buildGuestbookTestApp,
  CLEAN_SCORES,
  type GuestbookTestApp,
  flush,
} from '../../../test/helpers/build-test-app.ts';
import type { ModerationOutcome } from './moderation.port.ts';
import { PENDING_TTL_MS } from './review-worker.ts';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const TEXTS = [
  'Great site, love the colours',
  'Really clean layout here',
  'Fantastic animations, well done',
  'Smooth scrolling and playful design',
  'Hello from Gdansk, cheers',
] as const;

const pendingBodies = (app: GuestbookTestApp) =>
  app.repo.listArchive({ status: 'pending', limit: 10 }).map((row) => row.body);
const publishedBody = (app: GuestbookTestApp) => app.repo.findLatestApproved()?.body ?? null;

const TRANSIENT: ModerationOutcome = { kind: 'transient', code: 'provider_error' };

describe('review worker', () => {
  it('I-1: publishes a pending message only after the pipeline approves it', async () => {
    const app = buildGuestbookTestApp();
    app.moderation.set(TRANSIENT);
    app.submit({ body: TEXTS[0] });
    await app.worker.tick();
    expect(publishedBody(app)).toBeNull();

    app.moderation.set(CLEAN_SCORES);
    app.clock.advance(30 * SECOND);
    await app.worker.tick();
    expect(publishedBody(app)).toBe(TEXTS[0]);
    expect(pendingBodies(app)).toEqual([]);
  });

  it('AC-4: a message superseding an in-flight review is reviewed next, without waiting for the interval', async () => {
    const app = buildGuestbookTestApp();
    let release: () => void = () => undefined;
    let inFlight = 0;
    let maxInFlight = 0;
    app.moderation.set(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      // Only A's review is held open.
      if (app.moderation.calls.length === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      inFlight -= 1;
      return CLEAN_SCORES;
    });

    app.submit({ body: TEXTS[0] });
    await flush();
    expect(app.moderation.calls).toEqual([TEXTS[0]]);

    app.submit({ body: TEXTS[1] }); // supersedes A while A's provider call is outstanding
    expect(pendingBodies(app)).toEqual([TEXTS[1]]);
    release();
    // Only draining microtasks: an explicit tick() would set the rerun flag itself and hide a
    // dropped nudge.
    for (let i = 0; i < 5; i += 1) await flush();

    expect(publishedBody(app)).toBe(TEXTS[1]);
    expect(app.moderation.calls).toEqual([TEXTS[0], TEXTS[1]]);
    expect(maxInFlight).toBe(1);
    expect(app.logs()).toContain('"event":"stale_result"');
    expect(app.logs()).toContain('"event":"approved"');
  });

  it('AC-3: newest wins under an outage; after recovery only the last message is reviewed', async () => {
    const app = buildGuestbookTestApp();
    app.moderation.set(TRANSIENT);
    for (const text of TEXTS) {
      app.submit({ body: text });
      await app.worker.tick();
      app.clock.advance(5 * MINUTE);
    }
    expect(pendingBodies(app)).toEqual([TEXTS[4]]);

    app.moderation.set(CLEAN_SCORES);
    const callsBeforeRecovery = app.moderation.calls.length;
    app.clock.advance(3 * HOUR);
    await app.worker.tick();

    expect(app.moderation.calls.slice(callsBeforeRecovery)).toEqual([TEXTS[4]]);
    expect(app.suitability.calls).toEqual([TEXTS[4]]);
    expect(publishedBody(app)).toBe(TEXTS[4]);
  });

  it('retries with backoff, honours Retry-After, and never calls early', async () => {
    const app = buildGuestbookTestApp();
    app.moderation.set({ kind: 'transient', code: 'rate_limited', retryAfterSeconds: 600 });
    app.submit({ body: TEXTS[0] });
    await app.worker.tick();
    expect(app.moderation.calls).toHaveLength(1);

    app.clock.advance(9 * MINUTE);
    await app.worker.tick();
    expect(app.moderation.calls).toHaveLength(1);

    app.moderation.set(CLEAN_SCORES);
    app.suitability.set({ kind: 'transient', code: 'incomplete' });
    app.clock.advance(MINUTE);
    await app.worker.tick();
    expect(app.moderation.calls).toHaveLength(2);
    expect(app.suitability.calls).toHaveLength(1);

    // Second failure: the 2 minute step applies.
    app.clock.advance(MINUTE);
    await app.worker.tick();
    expect(app.suitability.calls).toHaveLength(1);
    app.clock.advance(MINUTE);
    app.suitability.set({ kind: 'ok', verdict: 'approve', reason: 'ok' });
    await app.worker.tick();
    expect(publishedBody(app)).toBe(TEXTS[0]);
    expect(app.logs()).toContain('"event":"retry_scheduled"');
  });

  it('I-6: a pending message older than 24 h is deleted, never reviewed or published', async () => {
    const app = buildGuestbookTestApp();
    app.moderation.set(TRANSIENT);
    app.submit({ body: TEXTS[0] });
    await app.worker.tick();

    app.moderation.set(CLEAN_SCORES);
    const callsBefore = app.moderation.calls.length;
    app.clock.advance(PENDING_TTL_MS + SECOND);
    await app.worker.tick();

    expect(pendingBodies(app)).toEqual([]);
    expect(publishedBody(app)).toBeNull();
    expect(app.moderation.calls).toHaveLength(callsBefore);
    expect(app.logs()).toContain('"event":"expired"');
  });

  it('I-4: a rejected message is deleted and remembered, so resending it costs no review', async () => {
    const app = buildGuestbookTestApp();
    app.suitability.set({ kind: 'ok', verdict: 'reject', reason: 'gibberish' });
    app.submit({ body: TEXTS[0] });
    await app.worker.tick();
    expect(pendingBodies(app)).toEqual([]);
    expect(publishedBody(app)).toBeNull();
    expect(app.logs()).toContain('"layer":"suitability"');

    const calls = app.moderation.calls.length;
    app.submit({ body: 'GREAT SITE, love the colours!' });
    await app.worker.tick();
    expect(app.moderation.calls).toHaveLength(calls);
    expect(pendingBodies(app)).toEqual([]);
  });

  it('startup recovers a stored pending message, and the interval retriggers review', async () => {
    const app = buildGuestbookTestApp();
    app.moderation.set(TRANSIENT);
    app.submit({ body: TEXTS[0] });
    await app.worker.tick();

    app.moderation.set(CLEAN_SCORES);
    app.clock.advance(30 * SECOND);
    app.worker.start();
    await app.worker.tick();
    expect(publishedBody(app)).toBe(TEXTS[0]);

    // Stored without a nudge (as after a restart): only the interval can pick it up.
    app.repo.insertPendingNewestWins({
      publicId: 'p-2',
      clientRequestId: 'c-2',
      body: TEXTS[1],
      paint: 'blue',
      locale: 'en',
      contentHash: 'h-2',
      now: app.clock.now(),
    });
    app.scheduler.fire();
    await app.worker.tick();
    expect(publishedBody(app)).toBe(TEXTS[1]);
  });

  it('stop() cancels the interval and waits for the in-flight review', async () => {
    const app = buildGuestbookTestApp();
    let release: () => void = () => undefined;
    app.moderation.set(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return CLEAN_SCORES;
    });
    app.worker.start();
    app.submit({ body: TEXTS[0] });
    await flush();
    expect(app.scheduler.active).toBe(1);

    let stopped = false;
    const stopping = app.worker.stop().then(() => {
      stopped = true;
    });
    await flush();
    expect(app.scheduler.active).toBe(0);
    expect(stopped).toBe(false);
    release();
    await stopping;
    expect(stopped).toBe(true);
  });
});
