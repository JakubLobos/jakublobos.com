import { describe, expect, it } from 'vitest';
import type { ApiResult } from './api/client.ts';
import type { GuestbookLatestData } from './api/guestbook.ts';
import { toLatestView } from './guestbook-latest.ts';

const message = {
  id: '0b7a2c1e-0000-4000-8000-000000000000',
  body: 'Love the paint drips!',
  paint: 'coral',
  publishedAt: '2026-10-25T12:00:00.000Z',
} as const;

describe('toLatestView', () => {
  it('shows the newest message with its paint', () => {
    const result: ApiResult<GuestbookLatestData> = { ok: true, data: { message } };
    expect(toLatestView(result)).toEqual({
      state: 'message',
      body: 'Love the paint drips!',
      paint: 'coral',
    });
  });

  it('shows the empty state when nothing is published', () => {
    expect(toLatestView({ ok: true, data: { message: null } })).toEqual({ state: 'empty' });
  });

  it('collapses every failure kind into the error state', () => {
    const failures: ApiResult<GuestbookLatestData>[] = [
      { ok: false, kind: 'network' },
      { ok: false, kind: 'unavailable' },
      { ok: false, kind: 'unexpected' },
      { ok: false, kind: 'rate_limited', retryAfterSeconds: 5 },
    ];
    for (const failure of failures) expect(toLatestView(failure)).toEqual({ state: 'error' });
  });
});
