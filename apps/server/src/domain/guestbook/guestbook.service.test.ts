import { describe, expect, it } from 'vitest';
import {
  buildGuestbookTestApp,
  type GuestbookTestApp,
} from '../../../test/helpers/build-test-app.ts';

const HOUR = 60 * 60 * 1000;
const rows = (app: GuestbookTestApp, status?: 'pending' | 'approved') =>
  app.repo.listArchive({ ...(status === undefined ? {} : { status }), limit: 200 });
const count = (app: GuestbookTestApp): number =>
  (app.db.prepare('SELECT COUNT(*) AS n FROM guestbook_messages').get() as { n: number }).n;

describe('guestbook service', () => {
  it('stores a valid message as the single pending row and answers accepted', () => {
    const app = buildGuestbookTestApp();
    expect(app.submit({ body: '  Lovely   portfolio  ', paint: 'blue', locale: 'pl' })).toEqual({
      kind: 'accepted',
    });
    expect(rows(app, 'pending')).toMatchObject([
      { body: 'Lovely portfolio', paint: 'blue', locale: 'pl', status: 'pending' },
    ]);
  });

  it('reports feedback-rule failures as field codes and stores nothing', () => {
    const app = buildGuestbookTestApp();
    expect(app.submit({ body: 'see https://example.com' })).toEqual({
      kind: 'invalid',
      fields: { body: ['links_not_allowed'] },
    });
    expect(app.submit({ body: '   ' })).toMatchObject({ kind: 'invalid' });
    expect(count(app)).toBe(0);
  });

  it('AC-5: silent drops answer accepted, store nothing, and never reach a provider', async () => {
    const app = buildGuestbookTestApp();
    const drops = [
      { website: 'http://spam.example' },
      { body: 'loooooooool nice site' },
      { body: 'buy crypto now' },
    ];
    for (const drop of drops) expect(app.submit(drop)).toEqual({ kind: 'accepted' });

    // A text rejected by review is remembered; resending it is dropped before the pipeline.
    app.suitability.set({ kind: 'ok', verdict: 'reject', reason: 'gibberish' });
    app.submit({ body: 'Totally ordinary note' });
    await app.worker.tick();
    const callsAfterReview = app.suitability.calls.length;
    expect(app.submit({ body: 'totally ordinary NOTE!' })).toEqual({ kind: 'accepted' });
    await app.worker.tick();

    expect(count(app)).toBe(0);
    expect(app.moderation.calls).toEqual(['Totally ordinary note']);
    expect(app.suitability.calls).toHaveLength(callsAfterReview);
    expect(app.logs()).toContain('"reason":"recently_rejected"');
  });

  it('I-5: one row per clientRequestId and per normalized text, however many arrive', () => {
    const app = buildGuestbookTestApp();
    const id = '11111111-1111-4111-8111-111111111111';
    for (let i = 0; i < 20; i += 1) {
      expect(app.submit({ clientRequestId: id, body: 'Hello there, nice site' }).kind).toBe(
        'accepted',
      );
    }
    for (let i = 0; i < 5; i += 1) app.submit({ body: 'HELLO there,   nice site!' });
    expect(count(app)).toBe(1);
  });

  it('I-7: 25 distinct submissions leave exactly one pending row, the last', () => {
    const app = buildGuestbookTestApp();
    for (let i = 1; i <= 25; i += 1) {
      app.submit({ body: `Note number ${String(i)} from a visitor` });
      app.clock.advance(HOUR / 4); // keeps the 20/h global cap out of the way
    }
    expect(rows(app, 'pending').map((row) => row.body)).toEqual(['Note number 25 from a visitor']);
    expect(app.logs()).toContain('"event":"superseded"');
  });

  it('I-3: 120 full review cycles never hold more than 100 rows, keeping the newest', async () => {
    const app = buildGuestbookTestApp();
    for (let i = 1; i <= 120; i += 1) {
      app.submit({ body: `Visitor note number ${String(i)}` });
      await app.worker.tick();
      expect(count(app)).toBeLessThanOrEqual(100);
      app.clock.advance(HOUR);
    }
    expect(rows(app, 'approved')).toHaveLength(100);
    expect(app.repo.findLatestApproved()?.body).toBe('Visitor note number 120');
  });

  it('I-8: the table has no column that could hold an address, agent, or visitor id', () => {
    const app = buildGuestbookTestApp();
    const columns = (
      app.db.prepare("SELECT name FROM pragma_table_info('guestbook_messages')").all() as {
        name: string;
      }[]
    ).map((column) => column.name);
    expect(columns.filter((name) => /ip|agent|visitor|fingerprint|session/i.test(name))).toEqual(
      [],
    );
  });

  it('caps globally at 20 per hour and 50 per day, with a Retry-After hint', () => {
    const app = buildGuestbookTestApp();
    const attempt = () => app.submit({ body: 'Nice work, really enjoyed the tour' });
    for (let i = 0; i < 20; i += 1) expect(attempt().kind).toBe('accepted');
    const busy = attempt();
    expect(busy).toEqual({ kind: 'busy', retryAfterSeconds: 3600 });

    app.clock.advance(HOUR);
    for (let i = 0; i < 20; i += 1) expect(attempt().kind).toBe('accepted');
    app.clock.advance(HOUR);
    for (let i = 0; i < 10; i += 1) expect(attempt().kind).toBe('accepted');
    expect(attempt().kind).toBe('busy');
  });
});
