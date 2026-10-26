import { existsSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { ConfigError, loadConfig } from '../config.ts';
import type {
  ArchiveExportRow,
  ArchiveRow,
  GuestbookRepository,
  GuestbookStatus,
} from '../domain/guestbook/repository.port.ts';
import { openDatabase, type Db } from '../infra/db/connection.ts';
import { createGuestbookRepository } from '../infra/db/guestbook.repository.ts';

export const EXIT_OK = 0;
export const EXIT_USAGE = 1;
export const EXIT_NOT_FOUND = 2;
export type ExitCode = typeof EXIT_OK | typeof EXIT_USAGE | typeof EXIT_NOT_FOUND;

const DEFAULT_LIST_LIMIT = 20;

const USAGE = `Usage: guestbook <command>

  list [--status approved|pending] [--limit N]
  export [--format json|csv] [--out file]
  delete <publicId> [--yes]
  purge-pending [--yes]`;

interface Sink {
  write(text: string): unknown;
}

export interface CliContext {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly stdout: Sink;
  readonly stderr: Sink;
  /** Null when stdin is not a terminal: destructive commands then require `--yes`. */
  readonly confirm: ((question: string) => Promise<boolean>) | null;
}

type Action = (repo: GuestbookRepository, ctx: CliContext) => Promise<ExitCode> | ExitCode;

class UsageError extends Error {}

function parse<const O extends NonNullable<Parameters<typeof parseArgs>[0]>['options']>(
  args: string[],
  options: O,
  positionalCount: number,
) {
  try {
    const { values, positionals } = parseArgs({ args, options, allowPositionals: true });
    if (positionals.length !== positionalCount) {
      throw new UsageError(
        positionalCount === 0 ? 'Unexpected argument' : 'Expected exactly one <publicId>',
      );
    }
    return { values, positionals };
  } catch (error) {
    // parseArgs reports unknown flags and missing option values as TypeError.
    if (error instanceof TypeError) throw new UsageError(error.message);
    throw error;
  }
}

function oneOf<T extends string>(name: string, value: string | undefined, allowed: readonly T[]) {
  if (value === undefined) return undefined;
  const match = allowed.find((candidate) => candidate === value);
  if (match === undefined) throw new UsageError(`--${name} must be one of: ${allowed.join(', ')}`);
  return match;
}

function positiveInt(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new UsageError(`--${name} must be a positive integer`);
  return Number(value);
}

const iso = (ms: number): string => new Date(ms).toISOString();

function formatListRow(row: ArchiveRow): string {
  const at = iso(row.approvedAt ?? row.createdAt);
  // JSON-quoting keeps control characters in untrusted text from reaching the terminal.
  return [
    row.publicId,
    row.status,
    row.paint,
    row.locale ?? '-',
    at,
    JSON.stringify(row.body),
  ].join('\t');
}

// Cells that start with these are evaluated as formulas by spreadsheet apps.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function csvCell(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function toCsv(rows: readonly ArchiveExportRow[]): string {
  const lines = rows.map((row) =>
    [row.publicId, row.body, row.paint, row.locale ?? '', iso(row.approvedAt)]
      .map(csvCell)
      .join(','),
  );
  return ['publicId,body,paint,locale,approvedAt', ...lines].join('\r\n') + '\r\n';
}

function toJson(rows: readonly ArchiveExportRow[]): string {
  const records = rows.map((row) => ({ ...row, approvedAt: iso(row.approvedAt) }));
  return `${JSON.stringify(records, null, 2)}\n`;
}

async function confirmed(
  ctx: CliContext,
  yes: boolean | undefined,
  question: string,
): Promise<boolean> {
  if (yes === true) return true;
  if (ctx.confirm === null) {
    ctx.stderr.write(
      'Refusing to continue without confirmation: stdin is not a terminal. Pass --yes.\n',
    );
    return false;
  }
  if (await ctx.confirm(question)) return true;
  ctx.stderr.write('Aborted.\n');
  return false;
}

function parseList(args: string[]): Action {
  const { values } = parse(args, { status: { type: 'string' }, limit: { type: 'string' } }, 0);
  const status: GuestbookStatus | undefined = oneOf('status', values.status, [
    'approved',
    'pending',
  ]);
  const limit = positiveInt('limit', values.limit, DEFAULT_LIST_LIMIT);
  return (repo, ctx) => {
    const rows = repo.listArchive({ ...(status === undefined ? {} : { status }), limit });
    for (const row of rows) ctx.stdout.write(`${formatListRow(row)}\n`);
    return EXIT_OK;
  };
}

function parseExport(args: string[]): Action {
  const { values } = parse(args, { format: { type: 'string' }, out: { type: 'string' } }, 0);
  const format = oneOf('format', values.format, ['json', 'csv']) ?? 'json';
  const out = values.out;
  return (repo, ctx) => {
    const rows = repo.exportArchive();
    const content = format === 'csv' ? toCsv(rows) : toJson(rows);
    if (out === undefined) {
      ctx.stdout.write(content);
    } else {
      // The archive is private (D-17): owner-only permissions.
      writeFileSync(out, content, { mode: 0o600 });
      ctx.stdout.write(`Exported ${rows.length} message(s) to ${out}\n`);
    }
    return EXIT_OK;
  };
}

function parseDelete(args: string[]): Action {
  const { values, positionals } = parse(args, { yes: { type: 'boolean' } }, 1);
  const [publicId] = positionals;
  if (publicId === undefined || publicId.trim() === '') throw new UsageError('<publicId> is empty');
  return async (repo, ctx) => {
    if (!(await confirmed(ctx, values.yes, `Delete message ${publicId}? [y/N] `))) {
      return EXIT_USAGE;
    }
    if (!repo.deleteByPublicId(publicId)) {
      ctx.stderr.write(`No message with public id ${publicId}\n`);
      return EXIT_NOT_FOUND;
    }
    ctx.stdout.write(`Deleted message ${publicId}\n`);
    return EXIT_OK;
  };
}

function parsePurge(args: string[]): Action {
  const { values } = parse(args, { yes: { type: 'boolean' } }, 0);
  return async (repo, ctx) => {
    if (!(await confirmed(ctx, values.yes, 'Delete the pending message? [y/N] '))) {
      return EXIT_USAGE;
    }
    ctx.stdout.write(`Purged ${repo.purgePending()} pending message(s)\n`);
    return EXIT_OK;
  };
}

function parseCommand(argv: string[]): Action {
  const [command, ...args] = argv;
  if (command === undefined) throw new UsageError('Missing command');
  switch (command) {
    case 'list':
      return parseList(args);
    case 'export':
      return parseExport(args);
    case 'delete':
      return parseDelete(args);
    case 'purge-pending':
      return parsePurge(args);
    default:
      throw new UsageError(`Unknown command: ${command}`);
  }
}

/**
 * Opens an existing, already-migrated database. Unlike the server it never creates the file
 * or runs migrations, so a wrong path fails loudly instead of yielding an empty archive.
 */
function openInitialized(path: string): Db {
  if (!existsSync(path)) throw new UsageError(`No database at ${path}`);
  const db = openDatabase(path);
  const initialized = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
    .get();
  if (initialized === undefined) {
    db.close();
    throw new UsageError(`Database at ${path} has no schema; start the API once to migrate it`);
  }
  return db;
}

/** Runs one CLI invocation. Message text goes to stdout only for `list` and `export`. */
export async function runCli(argv: string[], ctx: CliContext): Promise<ExitCode> {
  try {
    const action = parseCommand(argv);
    const config = loadConfig(ctx.env);
    const db = openInitialized(config.databasePath);
    try {
      return await action(createGuestbookRepository(db), ctx);
    } finally {
      db.close();
    }
  } catch (error) {
    if (error instanceof UsageError) {
      ctx.stderr.write(`${error.message}\n\n${USAGE}\n`);
      return EXIT_USAGE;
    }
    if (error instanceof ConfigError) {
      ctx.stderr.write(`${error.message}\n`);
      return EXIT_USAGE;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const interactive = process.stdin.isTTY;
  process.exitCode = await runCli(process.argv.slice(2), {
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
    confirm: interactive
      ? async (question) => {
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          try {
            return /^y(es)?$/i.test((await rl.question(question)).trim());
          } finally {
            rl.close();
          }
        }
      : null,
  });
}

if (import.meta.main) {
  await main();
}
