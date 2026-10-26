import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GuestbookRepository } from '../domain/guestbook/repository.port.ts';
import { openDatabase, type Db } from '../infra/db/connection.ts';
import { createGuestbookRepository } from '../infra/db/guestbook.repository.ts';
import { migrate } from '../infra/db/migrate.ts';
import { runCli, type CliContext, type ExitCode } from './guestbook-admin.ts';

const T0 = Date.UTC(2026, 0, 1);
const HOUR = 3_600_000;

let dir: string;
let dbPath: string;
let serverDb: Db;
let repo: GuestbookRepository;
let seq = 0;

function addMessage(body: string, { approved, at = T0 }: { approved: boolean; at?: number }) {
  seq += 1;
  repo.insertPendingNewestWins({
    publicId: `pub-${seq}`,
    clientRequestId: `req-${seq}`,
    body,
    paint: 'yellow',
    locale: seq % 2 === 0 ? 'pl' : null,
    contentHash: `hash-${seq}`,
    now: at,
  });
  if (approved) {
    const due = repo.findDuePending(at);
    if (due === null) throw new Error('seed: no pending row');
    repo.approve(due.id, at);
  }
  return `pub-${seq}`;
}

interface Run {
  code: ExitCode;
  out: string;
  err: string;
  prompts: string[];
}

async function run(
  argv: string[],
  options: { answer?: boolean; env?: Record<string, string> } = {},
): Promise<Run> {
  const prompts: string[] = [];
  let out = '';
  let err = '';
  const ctx: CliContext = {
    env: options.env ?? { DATABASE_PATH: dbPath },
    stdout: { write: (text) => (out += text) },
    stderr: { write: (text) => (err += text) },
    confirm:
      options.answer === undefined
        ? null
        : (question) => {
            prompts.push(question);
            return Promise.resolve(options.answer === true);
          },
  };
  const code = await runCli(argv, ctx);
  return { code, out, err, prompts };
}

beforeEach(() => {
  seq = 0;
  dir = mkdtempSync(join(tmpdir(), 'guestbook-cli-'));
  dbPath = join(dir, 'portfolio.db');
  // Stays open for the whole test, like the API process holding the same file (WAL).
  serverDb = openDatabase(dbPath);
  migrate(serverDb);
  repo = createGuestbookRepository(serverDb);
});

afterEach(() => {
  serverDb.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('usage errors', () => {
  it.each([
    [[], 'Missing command'],
    [['frobnicate'], 'Unknown command: frobnicate'],
    [['list', '--status', 'bogus'], '--status must be one of'],
    [['list', '--limit', '0'], '--limit must be a positive integer'],
    [['list', '--limit', '1.5'], '--limit must be a positive integer'],
    [['list', '--limit'], 'argument missing'],
    [['list', '--nope'], 'Unknown option'],
    [['list', 'extra'], 'Unexpected argument'],
    [['export', '--format', 'xml'], '--format must be one of'],
    [['delete'], 'Expected exactly one <publicId>'],
    [['delete', 'a', 'b'], 'Expected exactly one <publicId>'],
    [['delete', ' '], '<publicId> is empty'],
    [['purge-pending', 'x'], 'Unexpected argument'],
  ])('%j exits 1 with a message', async (argv, message) => {
    const result = await run(argv);
    expect(result.code).toBe(1);
    expect(result.err).toContain(message);
    expect(result.out).toBe('');
  });

  it('reports invalid configuration by variable name', async () => {
    const result = await run(['list'], { env: { PORT: 'abc' } });
    expect(result.code).toBe(1);
    expect(result.err).toContain('PORT');
  });
});

describe('database guard (AC-4)', () => {
  it('refuses a missing file without creating it', async () => {
    const missing = join(dir, 'nested', 'none.db');
    const result = await run(['list'], { env: { DATABASE_PATH: missing } });
    expect(result.code).toBe(1);
    expect(result.err).toContain('No database at');
    expect(() => statSync(join(dir, 'nested'))).toThrow();
  });

  it('refuses a database without schema_migrations and leaves it unmigrated', async () => {
    const bare = join(dir, 'bare.db');
    openDatabase(bare).close();
    const result = await run(['purge-pending', '--yes'], { env: { DATABASE_PATH: bare } });
    expect(result.code).toBe(1);
    expect(result.err).toContain('has no schema');
    const check = openDatabase(bare);
    expect(
      check.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'").get(),
    ).toEqual({ n: 0 });
    check.close();
  });
});

describe('list', () => {
  it('prints newest first with quoted bodies and honours --status and --limit', async () => {
    addMessage('older', { approved: true, at: T0 });
    addMessage('newer\u001b[31m', { approved: true, at: T0 + HOUR });
    addMessage('waiting', { approved: false, at: T0 + 2 * HOUR });

    const all = await run(['list']);
    expect(all.code).toBe(0);
    const lines = all.out.trimEnd().split('\n');
    expect(lines.map((line) => line.split('\t')[1])).toEqual(['pending', 'approved', 'approved']);
    expect(lines[1]).toContain('"newer\\u001b[31m"');
    expect(lines[1]).toContain('2026-01-01T01:00:00.000Z');

    const pending = await run(['list', '--status', 'pending']);
    expect(pending.out.trimEnd().split('\n')).toHaveLength(1);
    expect(pending.out).toContain('waiting');

    const limited = await run(['list', '--status', 'approved', '--limit', '1']);
    expect(limited.out).toContain('newer');
    expect(limited.out).not.toContain('older');
  });
});

describe('export', () => {
  beforeEach(() => {
    addMessage('first, "quoted"', { approved: true, at: T0 });
    addMessage('=HYPERLINK("x")', { approved: true, at: T0 + HOUR });
    addMessage('pending stays private', { approved: false, at: T0 + 2 * HOUR });
  });

  it('prints approved rows as JSON, newest first, with ISO timestamps', async () => {
    const result = await run(['export']);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out)).toEqual([
      {
        publicId: 'pub-2',
        body: '=HYPERLINK("x")',
        paint: 'yellow',
        locale: 'pl',
        approvedAt: '2026-01-01T01:00:00.000Z',
      },
      {
        publicId: 'pub-1',
        body: 'first, "quoted"',
        paint: 'yellow',
        locale: null,
        approvedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(result.out).not.toContain('pending stays private');
  });

  it('quotes CSV cells and neutralises spreadsheet formulas', async () => {
    const result = await run(['export', '--format', 'csv']);
    expect(result.out).toBe(
      [
        'publicId,body,paint,locale,approvedAt',
        `pub-2,"'=HYPERLINK(""x"")",yellow,pl,2026-01-01T01:00:00.000Z`,
        'pub-1,"first, ""quoted""",yellow,,2026-01-01T00:00:00.000Z',
        '',
      ].join('\r\n'),
    );
  });

  it('writes to --out with owner-only mode and keeps message text off stdout', async () => {
    const file = join(dir, 'archive.json');
    const result = await run(['export', '--out', file]);
    expect(result.out).toBe(`Exported 2 message(s) to ${file}\n`);
    expect(JSON.parse(readFileSync(file, 'utf8'))).toHaveLength(2);
    // Windows does not honour POSIX modes.
    if (process.platform !== 'win32') expect(statSync(file).mode & 0o777).toBe(0o600);
  });
});

describe('delete', () => {
  it('removes the message while the server connection stays usable (AC-3)', async () => {
    const id = addMessage('bye', { approved: true });
    const keep = addMessage('stay', { approved: true, at: T0 + HOUR });

    const result = await run(['delete', id, '--yes']);

    expect(result).toMatchObject({ code: 0, out: `Deleted message ${id}\n` });
    expect(repo.exportArchive().map((row) => row.publicId)).toEqual([keep]);
    // The server can still write after the CLI has opened and closed its own connection.
    addMessage('after', { approved: false, at: T0 + 2 * HOUR });
  });

  it('exits 2 for an unknown id (AC-2)', async () => {
    addMessage('stay', { approved: true });
    const result = await run(['delete', 'nope', '--yes']);
    expect(result.code).toBe(2);
    expect(result.err).toContain('No message with public id nope');
    expect(repo.exportArchive()).toHaveLength(1);
  });

  it('aborts when stdin is not interactive and --yes is absent (AC-2)', async () => {
    const id = addMessage('keep me', { approved: true });
    const result = await run(['delete', id]);
    expect(result.code).toBe(1);
    expect(result.err).toContain('Pass --yes');
    expect(repo.exportArchive()).toHaveLength(1);
  });

  it('asks interactively and only deletes on a yes', async () => {
    const id = addMessage('maybe', { approved: true });

    const declined = await run(['delete', id], { answer: false });
    expect(declined).toMatchObject({ code: 1, prompts: [`Delete message ${id}? [y/N] `] });
    expect(declined.err).toContain('Aborted.');
    expect(repo.exportArchive()).toHaveLength(1);

    const accepted = await run(['delete', id], { answer: true });
    expect(accepted.code).toBe(0);
    expect(repo.exportArchive()).toHaveLength(0);
  });
});

describe('purge-pending', () => {
  it('removes only the pending message and reports the count', async () => {
    addMessage('approved stays', { approved: true });
    addMessage('pending goes', { approved: false, at: T0 + HOUR });

    const result = await run(['purge-pending', '--yes']);

    expect(result).toMatchObject({ code: 0, out: 'Purged 1 pending message(s)\n' });
    expect(repo.exportArchive()).toHaveLength(1);
    expect(repo.listArchive({ status: 'pending', limit: 10 })).toEqual([]);
  });

  it('does nothing without confirmation', async () => {
    addMessage('pending stays', { approved: false });
    const result = await run(['purge-pending']);
    expect(result.code).toBe(1);
    expect(repo.listArchive({ status: 'pending', limit: 10 })).toHaveLength(1);
  });
});
