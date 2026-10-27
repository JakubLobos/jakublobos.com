import { IN_MEMORY, openDatabase, type Db } from './connection.ts';
import { migrate } from './migrate.ts';

/** A fresh, fully migrated in-memory database; every test gets its own (testing.md §2). */
export function createTestDb(): Db {
  const db = openDatabase(IN_MEMORY);
  migrate(db);
  return db;
}
