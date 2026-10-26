import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadConfig } from '../config.ts';
import { openDatabase } from '../infra/db/connection.ts';

export const KEEP_BACKUPS = 7;
const BACKUP_NAME = /^portfolio-\d{8}\.db$/;

export interface BackupOptions {
  readonly databasePath: string;
  readonly outDir: string;
  readonly now: Date;
  readonly keep: number;
  /** Called between copy cycles; tests use it to write to the live database mid-backup. */
  readonly onProgress?: () => void;
}

const stamp = (date: Date): string => date.toISOString().slice(0, 10).replaceAll('-', '');

/**
 * Online backup through SQLite's backup API: safe while the API is writing, unlike copying the
 * file (which can miss the WAL). One file per UTC day; a rerun the same day replaces it.
 */
export async function backupDatabase(options: BackupOptions): Promise<string> {
  const { databasePath, outDir, now, keep, onProgress } = options;
  // Refuse to create an empty database where a backup source was expected.
  if (!existsSync(databasePath)) throw new Error(`No database at ${databasePath}`);
  mkdirSync(outDir, { recursive: true, mode: 0o700 });

  const target = join(outDir, `portfolio-${stamp(now)}.db`);
  // Written under another name and renamed, so a crash never leaves a truncated "backup".
  const partial = `${target}.partial`;
  const db = openDatabase(databasePath);
  try {
    await db.backup(partial, {
      progress: () => {
        onProgress?.();
        return 100;
      },
    });
    renameSync(partial, target);
  } catch (error) {
    rmSync(partial, { force: true });
    throw error;
  } finally {
    db.close();
  }

  const stale = readdirSync(outDir)
    .filter((name) => BACKUP_NAME.test(name))
    .sort()
    .reverse()
    .slice(keep);
  for (const name of stale) rmSync(join(outDir, name));
  return target;
}

async function main(): Promise<void> {
  try {
    const { databasePath } = loadConfig(process.env);
    const target = await backupDatabase({
      databasePath,
      outDir: join(dirname(databasePath), 'backups'),
      now: new Date(),
      keep: KEEP_BACKUPS,
    });
    process.stdout.write(`Backup written to ${target}\n`);
  } catch (error) {
    // ConfigError carries variable names only; other messages hold paths, never row data.
    const message = error instanceof Error ? error.message : 'unknown error';
    process.stderr.write(`Backup failed: ${message}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
