import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../infra/db/connection.ts';
import { migrate } from '../infra/db/migrate.ts';
import { backupDatabase } from './backup.ts';

let dir: string;
let dbPath: string;
let live: Db;

const countMessages = (db: Db): number =>
  (db.prepare('SELECT count(*) AS n FROM guestbook_messages').get() as { n: number }).n;

function insertRow(db: Db, n: number): void {
  db.prepare(
    `INSERT INTO guestbook_messages
       (public_id, client_request_id, body, paint, content_hash, status, created_at, approved_at)
     VALUES (?, ?, 'hello', 'yellow', ?, 'approved', 1, 1)`,
  ).run(`pub-${n}`, `req-${n}`, `hash-${n}`);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'backup-test-'));
  dbPath = join(dir, 'portfolio.db');
  live = openDatabase(dbPath);
  migrate(live);
});

afterEach(() => {
  live.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('backupDatabase', () => {
  it('copies a consistent snapshot while the live connection keeps writing', async () => {
    // Enough pages that the copy takes several cycles, so writes land in between.
    live.exec('CREATE TABLE filler (x BLOB)');
    const insertFiller = live.prepare('INSERT INTO filler VALUES (zeroblob(1024))');
    for (let i = 0; i < 4000; i += 1) insertFiller.run();
    insertRow(live, 0);

    let cycles = 0;
    let written = 0;
    const target = await backupDatabase({
      databasePath: dbPath,
      outDir: join(dir, 'backups'),
      now: new Date('2026-10-26T12:00:00Z'),
      keep: 7,
      onProgress: () => {
        cycles += 1;
        // Only early cycles: SQLite restarts the copy after an outside write, so endless
        // writes would never let it finish.
        if (cycles <= 3) {
          written += 1;
          insertRow(live, written);
        }
      },
    });

    expect(cycles).toBeGreaterThan(3);
    expect(target.endsWith('portfolio-20261026.db')).toBe(true);
    const copy = openDatabase(target);
    try {
      expect(copy.pragma('integrity_check', { simple: true })).toBe('ok');
      expect(countMessages(copy)).toBe(countMessages(live));
    } finally {
      copy.close();
    }
    expect(readdirSync(join(dir, 'backups'))).toEqual(['portfolio-20261026.db']);
  });

  it('keeps only the newest N daily backups and ignores other files', async () => {
    const outDir = join(dir, 'backups');
    for (let day = 1; day <= 9; day += 1) {
      await backupDatabase({
        databasePath: dbPath,
        outDir,
        now: new Date(Date.UTC(2026, 9, day)),
        keep: 3,
      });
    }
    writeFileSync(join(outDir, 'notes.txt'), 'keep me');
    await backupDatabase({
      databasePath: dbPath,
      outDir,
      now: new Date(Date.UTC(2026, 9, 10)),
      keep: 3,
    });
    expect(readdirSync(outDir).sort()).toEqual([
      'notes.txt',
      'portfolio-20261008.db',
      'portfolio-20261009.db',
      'portfolio-20261010.db',
    ]);
  });

  it('refuses a missing database instead of creating an empty one', async () => {
    await expect(
      backupDatabase({
        databasePath: join(dir, 'missing.db'),
        outDir: join(dir, 'backups'),
        now: new Date(),
        keep: 7,
      }),
    ).rejects.toThrow('No database at');
    expect(readdirSync(dir)).not.toContain('missing.db');
  });
});
