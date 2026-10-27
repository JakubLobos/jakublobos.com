import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GUESTBOOK_MAX_PENDING, GUESTBOOK_RETENTION_LIMIT } from '@portfolio/contracts';
import type {
  GuestbookRepository,
  NewPendingMessage,
} from '../../domain/guestbook/repository.port.ts';
import { IN_MEMORY, openDatabase, type Db } from './connection.ts';
import { createGuestbookRepository } from './guestbook.repository.ts';
import { migrate } from './migrate.ts';
import { createTestDb } from './test-db.ts';

const T0 = Date.UTC(2026, 0, 1);
const MINUTE = 60_000;

let seq = 0;
function message(overrides: Partial<NewPendingMessage> = {}): NewPendingMessage {
  seq += 1;
  return {
    publicId: `pub-${seq}`,
    clientRequestId: `req-${seq}`,
    body: `hello ${seq}`,
    paint: 'yellow',
    locale: 'en',
    contentHash: `hash-${seq}`,
    now: T0,
    ...overrides,
  };
}

function setup(path?: string): { db: Db; repo: GuestbookRepository } {
  let db: Db;
  if (path === undefined) {
    db = createTestDb();
  } else {
    db = openDatabase(path);
    migrate(db);
  }
  return { db, repo: createGuestbookRepository(db) };
}

function rows(db: Db): { public_id: string; status: string }[] {
  return db
    .prepare<[], { public_id: string; status: string }>(
      'SELECT public_id, status FROM guestbook_messages ORDER BY id',
    )
    .all();
}

describe('migrations', () => {
  it('create the exact schema and are idempotent', () => {
    const db = openDatabase(IN_MEMORY);
    expect(migrate(db)).toEqual(['0001_guestbook.sql', '0002_submission_outcomes.sql']);
    expect(migrate(db)).toEqual([]);

    const schema = db
      .prepare<[], { name: string; sql: string }>(
        "SELECT name, sql FROM sqlite_master WHERE name LIKE '%guestbook%' AND sql IS NOT NULL",
      )
      .all();
    const byName = new Map(schema.map((entry) => [entry.name, entry.sql]));
    expect([...byName.keys()].sort()).toEqual([
      'guestbook_messages',
      'guestbook_submission_outcomes',
      'ix_guestbook_approved',
      'trg_guestbook_retention_cap',
      'ux_guestbook_single_pending',
    ]);
    expect(byName.get('ux_guestbook_single_pending')).toMatch(/WHERE status = 'pending'/);
    // The SQL literals must agree with the contract constants.
    expect(byName.get('trg_guestbook_retention_cap')).toContain(`>= ${GUESTBOOK_RETENTION_LIMIT}`);
    expect(GUESTBOOK_MAX_PENDING).toBe(1);
    expect(db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get()).toEqual({ n: 2 });
  });
});

describe('insertPendingNewestWins', () => {
  let db: Db;
  let repo: GuestbookRepository;
  beforeEach(() => {
    ({ db, repo } = setup());
  });

  it('keeps only the newest pending row and reports how many it superseded', () => {
    const a = message();
    const b = message();
    expect(repo.insertPendingNewestWins(a)).toEqual({ kind: 'inserted', supersededCount: 0 });
    expect(repo.insertPendingNewestWins(b)).toEqual({ kind: 'inserted', supersededCount: 1 });
    expect(rows(db)).toEqual([{ public_id: b.publicId, status: 'pending' }]);
  });

  it('is backed by a partial unique index, not only by the transaction', () => {
    repo.insertPendingNewestWins(message());
    const direct = db.prepare(
      `INSERT INTO guestbook_messages
         (public_id, client_request_id, body, paint, content_hash, status, created_at)
       VALUES ('x', 'x', 'x', 'red', 'x', 'pending', 'x')`,
    );
    expect(() => direct.run()).toThrow(/UNIQUE/);
  });

  it.each([
    ['clientRequestId', (first: NewPendingMessage) => ({ clientRequestId: first.clientRequestId })],
    ['contentHash', (first: NewPendingMessage) => ({ contentHash: first.contentHash })],
  ])('treats a repeated %s as a duplicate without superseding anything', (_name, pick) => {
    const first = message();
    repo.insertPendingNewestWins(first);
    expect(repo.insertPendingNewestWins(message(pick(first)))).toEqual({ kind: 'duplicate' });
    expect(rows(db)).toEqual([{ public_id: first.publicId, status: 'pending' }]);
  });

  it('maps a publicId collision to duplicate and rolls the supersede back', () => {
    // The colliding id must belong to an approved row: a pending one would be superseded first.
    const approved = message();
    repo.insertPendingNewestWins(approved);
    repo.approve(repo.findDuePending(T0)?.id ?? -1, T0);
    const pending = message();
    repo.insertPendingNewestWins(pending);

    expect(repo.insertPendingNewestWins(message({ publicId: approved.publicId }))).toEqual({
      kind: 'duplicate',
    });
    expect(rows(db)).toEqual([
      { public_id: approved.publicId, status: 'approved' },
      { public_id: pending.publicId, status: 'pending' },
    ]);
  });

  it('retains at most 100 rows, evicting the oldest approved first', () => {
    const published: string[] = [];
    for (let i = 0; i < 150; i += 1) {
      const m = message({ now: T0 + i * MINUTE });
      published.push(m.publicId);
      repo.insertPendingNewestWins(m);
      const pending = repo.findDuePending(m.now);
      expect(pending).not.toBeNull();
      expect(repo.approve(pending?.id ?? -1, m.now)).toBe(true);
    }
    const kept = rows(db).map((row) => row.public_id);
    expect(kept).toEqual(published.slice(50));
    expect(repo.findLatestApproved()?.publicId).toBe(published[149]);
  });

  it('never evicts the pending row to make room', () => {
    for (let i = 0; i < GUESTBOOK_RETENTION_LIMIT; i += 1) {
      repo.insertPendingNewestWins(message({ now: T0 + i }));
      repo.approve(repo.findDuePending(T0 + i)?.id ?? -1, T0 + i);
    }
    const last = message({ now: T0 + 1_000 });
    repo.insertPendingNewestWins(last);
    const all = rows(db);
    expect(all).toHaveLength(GUESTBOOK_RETENTION_LIMIT);
    expect(all.at(-1)).toEqual({ public_id: last.publicId, status: 'pending' });
  });

  it('is blocked by the trigger when a 101st row is inserted directly', () => {
    const insert = db.prepare(
      `INSERT INTO guestbook_messages
         (public_id, client_request_id, body, paint, content_hash, status, created_at, approved_at)
       VALUES (@n, @n, 'x', 'red', @n, 'approved', 't', 't')`,
    );
    for (let i = 0; i < GUESTBOOK_RETENTION_LIMIT; i += 1) insert.run({ n: `row-${i}` });
    expect(() => insert.run({ n: 'row-101' })).toThrow(/guestbook_retention_cap/);
  });
});

describe('review lifecycle', () => {
  let repo: GuestbookRepository;
  beforeEach(() => {
    ({ repo } = setup());
  });

  it('approves only from pending', () => {
    const m = message();
    repo.insertPendingNewestWins(m);
    const id = repo.findDuePending(T0)?.id ?? -1;
    expect(repo.approve(id, T0 + 1)).toBe(true);
    expect(repo.approve(id, T0 + 2)).toBe(false);
    expect(repo.findLatestApproved()).toMatchObject({ publicId: m.publicId, approvedAt: T0 + 1 });

    repo.insertPendingNewestWins(message());
    const removed = repo.findDuePending(T0)?.id ?? -1;
    repo.deletePending(removed);
    expect(repo.approve(removed, T0)).toBe(false);
  });

  it('never reuses ids, so a stale approve cannot publish a newer unreviewed row', () => {
    repo.insertPendingNewestWins(message());
    const staleId = repo.findDuePending(T0)?.id ?? -1;
    repo.insertPendingNewestWins(message());
    const newer = repo.findDuePending(T0);
    expect(newer?.id).not.toBe(staleId);
    expect(repo.approve(staleId, T0)).toBe(false);
    expect(repo.findLatestApproved()).toBeNull();
  });

  it('hides a failed message until its retry time and counts attempts', () => {
    repo.insertPendingNewestWins(message());
    const first = repo.findDuePending(T0);
    expect(first?.attempts).toBe(0);
    repo.recordFailure(first?.id ?? -1, 'timeout', T0 + 30_000);
    expect(repo.findDuePending(T0 + 29_999)).toBeNull();
    expect(repo.findDuePending(T0 + 30_000)?.attempts).toBe(1);
  });

  it('deletes only pending rows older than the cutoff', () => {
    repo.insertPendingNewestWins(message({ now: T0 }));
    expect(repo.deleteExpiredPending(T0)).toBe(0);
    expect(repo.deleteExpiredPending(T0 + 1)).toBe(1);
    expect(repo.findDuePending(T0 + 1)).toBeNull();
  });

  it('deletePending does not touch approved rows', () => {
    repo.insertPendingNewestWins(message());
    const id = repo.findDuePending(T0)?.id ?? -1;
    repo.approve(id, T0);
    expect(repo.deletePending(id)).toBe(false);
    expect(repo.findLatestApproved()).not.toBeNull();
  });
});

describe('submission outcomes (ADR-0017)', () => {
  it('reports each state by token and stores no text for rejected or superseded rows', () => {
    const { db, repo } = setup();
    const first = message({ body: 'unique-secret-body' });
    expect(repo.findSubmissionStatus(first.clientRequestId)).toBeNull();

    repo.insertPendingNewestWins(first);
    expect(repo.findSubmissionStatus(first.clientRequestId)).toEqual({ status: 'pending' });

    const second = message();
    repo.insertPendingNewestWins(second);
    expect(repo.findSubmissionStatus(first.clientRequestId)).toEqual({ status: 'superseded' });

    const id = repo.findDuePending(T0)?.id ?? -1;
    expect(repo.rejectPending(id, 'off_topic', T0 + 1)).toBe(true);
    expect(repo.rejectPending(id, 'off_topic', T0 + 1)).toBe(false);
    expect(repo.findSubmissionStatus(second.clientRequestId)).toEqual({
      status: 'rejected',
      reason: 'off_topic',
    });

    const third = message();
    repo.insertPendingNewestWins(third);
    repo.approve(repo.findDuePending(T0)?.id ?? -1, T0 + 2);
    expect(repo.findSubmissionStatus(third.clientRequestId)).toEqual({ status: 'approved' });

    repo.recordRejection('dropped-token', 'inappropriate', T0);
    expect(repo.findSubmissionStatus('dropped-token')).toEqual({
      status: 'rejected',
      reason: 'inappropriate',
    });

    const columns = db
      .prepare<[], { name: string }>("PRAGMA table_info('guestbook_submission_outcomes')")
      .all()
      .map((column) => column.name);
    expect(columns).toEqual(['client_request_id', 'outcome', 'reason', 'created_at']);
  });

  it('prunes outcomes with the pending retention and caps the table size', () => {
    const { db, repo } = setup();
    repo.recordRejection('old', 'off_topic', T0);
    repo.deleteExpiredPending(T0 + 1);
    expect(repo.findSubmissionStatus('old')).toBeNull();

    for (let i = 0; i < 1100; i += 1) repo.recordRejection(`flood-${i}`, 'off_topic', T0 + i);
    const count = db
      .prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM guestbook_submission_outcomes')
      .get();
    expect(count?.n).toBe(1000);
    expect(repo.findSubmissionStatus('flood-1099')).not.toBeNull();
    expect(repo.findSubmissionStatus('flood-0')).toBeNull();
  });
});

describe('archive', () => {
  it('exports approved rows only, newest first', () => {
    const { repo } = setup();
    const ids = [0, 1, 2].map((i) => {
      const m = message({ now: T0 + i * MINUTE, locale: i === 1 ? 'pl' : null });
      repo.insertPendingNewestWins(m);
      repo.approve(repo.findDuePending(m.now)?.id ?? -1, m.now);
      return m.publicId;
    });
    const pending = message({ now: T0 + 10 * MINUTE });
    repo.insertPendingNewestWins(pending);

    const exported = repo.exportArchive();
    expect(exported.map((row) => row.publicId)).toEqual(ids.toReversed());
    expect(Object.keys(exported[0] ?? {}).sort()).toEqual(
      ['approvedAt', 'body', 'locale', 'paint', 'publicId'].sort(),
    );
    expect(exported[1]?.locale).toBe('pl');

    expect(repo.listArchive({ limit: 10 })[0]?.publicId).toBe(pending.publicId);
    expect(repo.listArchive({ status: 'approved', limit: 2 })).toHaveLength(2);
    expect(repo.listArchive({ status: 'pending', limit: 10 })).toHaveLength(1);
  });

  it('deletes by public id and purges pending', () => {
    const { repo } = setup();
    const m = message();
    repo.insertPendingNewestWins(m);
    expect(repo.purgePending()).toBe(1);
    repo.insertPendingNewestWins(m);
    expect(repo.deleteByPublicId(m.publicId)).toBe(true);
    expect(repo.deleteByPublicId(m.publicId)).toBe(false);
  });
});

describe('file-backed database (WAL)', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'portfolio-db-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates missing parent directories and lets a second connection read, export and delete', () => {
    const path = join(dir, 'nested', 'deeper', 'test.db');
    const api = setup(path);
    const m = message();
    api.repo.insertPendingNewestWins(m);
    api.repo.approve(api.repo.findDuePending(T0)?.id ?? -1, T0);

    const cli = setup(path);
    expect(api.db.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(cli.repo.exportArchive().map((row) => row.publicId)).toEqual([m.publicId]);
    expect(cli.repo.deleteByPublicId(m.publicId)).toBe(true);
    expect(api.repo.findLatestApproved()).toBeNull();

    api.db.close();
    cli.db.close();
  });

  it('ping answers on an open connection and throws once closed', () => {
    const { db, repo } = setup();
    expect(() => {
      repo.ping();
    }).not.toThrow();
    db.close();
    expect(() => {
      repo.ping();
    }).toThrow();
  });
});
