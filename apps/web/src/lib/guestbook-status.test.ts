import { describe, expect, it } from 'vitest';
import {
  parseStoredSubmission,
  pollDelay,
  POLL_BUDGET_MS,
  RESUME_WINDOW_MS,
  serializeSubmission,
  toStatusStep,
} from './guestbook-status.ts';

describe('pollDelay', () => {
  it('waits 1.5 s, 2 s, 3 s and then 5 s between polls', () => {
    let elapsed = 0;
    const waits: number[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const wait = pollDelay(attempt, elapsed);
      if (wait === null) break;
      waits.push(wait);
      elapsed += wait;
    }
    expect(waits.slice(0, 6)).toEqual([1_500, 2_000, 3_000, 5_000, 5_000, 5_000]);
  });

  it('stops after 60 s in total, shortening the last wait to land on the budget', () => {
    let elapsed = 0;
    let attempt = 0;
    for (
      let wait = pollDelay(attempt, elapsed);
      wait !== null;
      wait = pollDelay(attempt, elapsed)
    ) {
      elapsed += wait;
      attempt += 1;
    }
    expect(elapsed).toBe(POLL_BUDGET_MS);
    expect(pollDelay(attempt, POLL_BUDGET_MS)).toBeNull();
    expect(pollDelay(0, POLL_BUDGET_MS + 1)).toBeNull();
  });
});

describe('toStatusStep', () => {
  const ok = (data: {
    status: 'pending' | 'approved' | 'rejected' | 'superseded';
    reason?: never;
  }) => toStatusStep({ ok: true, data });

  it('keeps polling while pending and on transient failures', () => {
    expect(ok({ status: 'pending' })).toEqual({ kind: 'continue' });
    for (const kind of ['network', 'unavailable', 'unexpected'] as const) {
      expect(toStatusStep({ ok: false, kind })).toEqual({ kind: 'continue' });
    }
    expect(toStatusStep({ ok: false, kind: 'rate_limited', retryAfterSeconds: null })).toEqual({
      kind: 'continue',
    });
  });

  it('stops on every terminal status and on 404', () => {
    expect(ok({ status: 'approved' })).toEqual({ kind: 'done', view: { state: 'approved' } });
    expect(ok({ status: 'superseded' })).toEqual({ kind: 'done', view: { state: 'superseded' } });
    expect(toStatusStep({ ok: true, data: { status: 'rejected', reason: 'off_topic' } })).toEqual({
      kind: 'done',
      view: { state: 'rejected', reason: 'off_topic' },
    });
    expect(toStatusStep({ ok: false, kind: 'not_found' })).toEqual({
      kind: 'done',
      view: { state: 'slow' },
    });
  });
});

describe('parseStoredSubmission', () => {
  const now = 1_000_000;
  const stored = (sentAt: number) =>
    serializeSubmission({ token: '00000000-0000-4000-8000-000000000001', sentAt, tint: 'blue' });

  it('resumes only a fresh, well-formed record', () => {
    expect(parseStoredSubmission(stored(now - 5_000), now)).toMatchObject({ tint: 'blue' });
    expect(parseStoredSubmission(stored(now - RESUME_WINDOW_MS), now)).toBeNull();
    expect(parseStoredSubmission(stored(now + 1), now)).toBeNull();
  });

  it('rejects missing, malformed or tampered values', () => {
    expect(parseStoredSubmission(null, now)).toBeNull();
    expect(parseStoredSubmission('{nope', now)).toBeNull();
    expect(parseStoredSubmission('42', now)).toBeNull();
    expect(
      parseStoredSubmission(JSON.stringify({ token: 1, sentAt: now, tint: 'blue' }), now),
    ).toBeNull();
    expect(
      parseStoredSubmission(JSON.stringify({ token: 'x', sentAt: now, tint: 'pink' }), now),
    ).toBeNull();
  });
});
