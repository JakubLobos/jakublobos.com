import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Db } from './connection.ts';

const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations/', import.meta.url));
const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;

/** Applies pending forward-only migrations in filename order; returns the names it applied. */
export function migrate(db: Db, dir: string = MIGRATIONS_DIR): string[] {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY) STRICT');
  const applied = new Set(
    db
      .prepare<[], { name: string }>('SELECT name FROM schema_migrations')
      .all()
      .map((row) => row.name),
  );
  const record = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');

  const files = readdirSync(dir)
    .filter((file) => MIGRATION_FILE.test(file))
    .sort();
  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), 'utf8');
    // The schema change and its bookkeeping row commit together or not at all.
    db.transaction(() => {
      db.exec(sql);
      record.run(file);
    })();
    newlyApplied.push(file);
  }
  return newlyApplied;
}
