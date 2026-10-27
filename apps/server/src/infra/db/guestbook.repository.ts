import { GUESTBOOK_RETENTION_LIMIT, type SubmissionReason } from '@portfolio/contracts';
import { LocaleSchema, PaintIdSchema } from '@portfolio/contracts/schemas';
import { z } from 'zod';
import type {
  ApprovedMessage,
  ArchiveExportRow,
  ArchiveRow,
  GuestbookRepository,
  NewPendingMessage,
  PendingMessage,
  SubmissionStatusResult,
} from '../../domain/guestbook/repository.port.ts';
import type { Db } from './connection.ts';

const RowSchema = z.object({
  id: z.number().int(),
  public_id: z.string(),
  body: z.string(),
  paint: PaintIdSchema,
  locale: LocaleSchema.nullable(),
  content_hash: z.string(),
  status: z.enum(['pending', 'approved']),
  attempts: z.number().int(),
  created_at: z.string(),
  approved_at: z.string().nullable(),
});
type Row = z.infer<typeof RowSchema>;

// Fixed-width ISO strings sort lexicographically, so SQL comparisons on them are chronological.
const toDb = (ms: number): string => new Date(ms).toISOString();
const fromDb = (iso: string): number => Date.parse(iso);

function approvedAtOf(row: Row): number {
  if (row.approved_at === null) {
    throw new Error('approved row without approved_at');
  }
  return fromDb(row.approved_at);
}

// Outcomes carry no text, but a distributed flood of silent drops must not grow the table.
const OUTCOMES_MAX_ROWS = 1000;

const OutcomeRowSchema = z.object({
  outcome: z.enum(['rejected', 'superseded']),
  reason: z.enum(['inappropriate', 'off_topic', 'impersonation', 'personal_data']).nullable(),
});

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

export function createGuestbookRepository(db: Db): GuestbookRepository {
  const existsDuplicate = db.prepare(
    'SELECT 1 FROM guestbook_messages WHERE client_request_id = ? OR content_hash = ? LIMIT 1',
  );
  const deleteAllPending = db.prepare("DELETE FROM guestbook_messages WHERE status = 'pending'");
  const countAll = db.prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM guestbook_messages');
  const evictOldestApproved = db.prepare(
    `DELETE FROM guestbook_messages WHERE id IN (
       SELECT id FROM guestbook_messages WHERE status = 'approved'
       ORDER BY approved_at ASC, id ASC LIMIT ?)`,
  );
  const insertPending = db.prepare(
    `INSERT INTO guestbook_messages
       (public_id, client_request_id, body, paint, locale, content_hash, status,
        attempts, next_attempt_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
  );
  const selectLatestApproved = db.prepare(
    `SELECT * FROM guestbook_messages WHERE status = 'approved'
     ORDER BY approved_at DESC, id DESC LIMIT 1`,
  );
  const selectDuePending = db.prepare(
    `SELECT * FROM guestbook_messages
     WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
     ORDER BY created_at DESC, id DESC LIMIT 1`,
  );
  const approveRow = db.prepare(
    `UPDATE guestbook_messages
     SET status = 'approved', approved_at = ?, next_attempt_at = NULL, last_error_code = NULL
     WHERE id = ? AND status = 'pending'`,
  );
  const deletePendingRow = db.prepare(
    "DELETE FROM guestbook_messages WHERE id = ? AND status = 'pending'",
  );
  const failRow = db.prepare(
    `UPDATE guestbook_messages
     SET attempts = attempts + 1, last_error_code = ?, next_attempt_at = ?
     WHERE id = ? AND status = 'pending'`,
  );
  const deleteExpired = db.prepare(
    "DELETE FROM guestbook_messages WHERE status = 'pending' AND created_at < ?",
  );
  const selectArchive = db.prepare(
    `SELECT * FROM guestbook_messages WHERE (? IS NULL OR status = ?)
     ORDER BY COALESCE(approved_at, created_at) DESC, id DESC LIMIT ?`,
  );
  const selectApproved = db.prepare(
    "SELECT * FROM guestbook_messages WHERE status = 'approved' ORDER BY approved_at DESC, id DESC",
  );
  const recordSuperseded = db.prepare(
    `INSERT OR REPLACE INTO guestbook_submission_outcomes
       (client_request_id, outcome, reason, created_at)
     SELECT client_request_id, 'superseded', NULL, ? FROM guestbook_messages WHERE status = 'pending'`,
  );
  const insertRejection = db.prepare(
    `INSERT OR REPLACE INTO guestbook_submission_outcomes
       (client_request_id, outcome, reason, created_at) VALUES (?, 'rejected', ?, ?)`,
  );
  const insertRejectionForRow = db.prepare(
    `INSERT OR REPLACE INTO guestbook_submission_outcomes
       (client_request_id, outcome, reason, created_at)
     SELECT client_request_id, 'rejected', ?, ? FROM guestbook_messages
     WHERE id = ? AND status = 'pending'`,
  );
  const trimOutcomes = db.prepare(
    `DELETE FROM guestbook_submission_outcomes WHERE client_request_id IN (
       SELECT client_request_id FROM guestbook_submission_outcomes
       ORDER BY created_at DESC, rowid DESC LIMIT -1 OFFSET ?)`,
  );
  const deleteExpiredOutcomes = db.prepare(
    'DELETE FROM guestbook_submission_outcomes WHERE created_at < ?',
  );
  const selectMessageStatus = db.prepare<[string], { status: 'pending' | 'approved' }>(
    'SELECT status FROM guestbook_messages WHERE client_request_id = ?',
  );
  const selectOutcome = db.prepare(
    'SELECT outcome, reason FROM guestbook_submission_outcomes WHERE client_request_id = ?',
  );
  const deleteByPublic = db.prepare('DELETE FROM guestbook_messages WHERE public_id = ?');

  const insertNewestWins = db.transaction((m: NewPendingMessage) => {
    // 1-2. Duplicates are detected before anything is deleted.
    if (existsDuplicate.get(m.clientRequestId, m.contentHash) !== undefined) {
      return { kind: 'duplicate' } as const;
    }
    // 3. Newest wins: at most one pending row exists. Its token keeps answering "superseded".
    recordSuperseded.run(toDb(m.now));
    trimOutcomes.run(OUTCOMES_MAX_ROWS);
    const supersededCount = deleteAllPending.run().changes;
    // 4. Make room for the new row (the trigger is the backstop).
    const total = countAll.get()?.n ?? 0;
    const excess = total - (GUESTBOOK_RETENTION_LIMIT - 1);
    if (excess > 0) {
      evictOldestApproved.run(excess);
    }
    // 5. Due immediately.
    const at = toDb(m.now);
    insertPending.run(
      m.publicId,
      m.clientRequestId,
      m.body,
      m.paint,
      m.locale,
      m.contentHash,
      at,
      at,
    );
    return { kind: 'inserted', supersededCount } as const;
  });

  const rejectInTransaction = db.transaction(
    (id: number, reason: SubmissionReason, now: number): boolean => {
      insertRejectionForRow.run(reason, toDb(now), id);
      return deletePendingRow.run(id).changes === 1;
    },
  );

  const toPending = (row: Row): PendingMessage => ({
    id: row.id,
    publicId: row.public_id,
    body: row.body,
    paint: row.paint,
    locale: row.locale,
    contentHash: row.content_hash,
    attempts: row.attempts,
    createdAt: fromDb(row.created_at),
  });

  return {
    insertPendingNewestWins(message) {
      try {
        return insertNewestWins.immediate(message);
      } catch (error) {
        // A concurrent writer won the race on a UNIQUE column; the transaction rolled back.
        if (isUniqueViolation(error)) return { kind: 'duplicate' };
        throw error;
      }
    },

    findLatestApproved(): ApprovedMessage | null {
      const raw = selectLatestApproved.get();
      if (raw === undefined) return null;
      const row = RowSchema.parse(raw);
      return {
        publicId: row.public_id,
        body: row.body,
        paint: row.paint,
        approvedAt: approvedAtOf(row),
      };
    },

    findDuePending(now) {
      const raw = selectDuePending.get(toDb(now));
      return raw === undefined ? null : toPending(RowSchema.parse(raw));
    },

    approve: (id, now) => approveRow.run(toDb(now), id).changes === 1,
    deletePending: (id) => deletePendingRow.run(id).changes === 1,
    rejectPending: (id, reason, now) => rejectInTransaction.immediate(id, reason, now),
    recordRejection(clientRequestId, reason, now) {
      insertRejection.run(clientRequestId, reason, toDb(now));
      trimOutcomes.run(OUTCOMES_MAX_ROWS);
    },
    findSubmissionStatus(clientRequestId): SubmissionStatusResult | null {
      const message = selectMessageStatus.get(clientRequestId);
      if (message !== undefined) return { status: message.status };
      const raw = selectOutcome.get(clientRequestId);
      if (raw === undefined) return null;
      const outcome = OutcomeRowSchema.parse(raw);
      return outcome.outcome === 'rejected' && outcome.reason !== null
        ? { status: 'rejected', reason: outcome.reason }
        : { status: 'superseded' };
    },
    recordFailure(id, code, nextAttemptAt) {
      failRow.run(code, toDb(nextAttemptAt), id);
    },
    deleteExpiredPending(createdBefore) {
      deleteExpiredOutcomes.run(toDb(createdBefore));
      return deleteExpired.run(toDb(createdBefore)).changes;
    },

    listArchive({ status, limit }): ArchiveRow[] {
      return selectArchive
        .all(status ?? null, status ?? null, limit)
        .map((raw) => RowSchema.parse(raw))
        .map((row) => ({
          publicId: row.public_id,
          body: row.body,
          paint: row.paint,
          locale: row.locale,
          status: row.status,
          createdAt: fromDb(row.created_at),
          approvedAt: row.approved_at === null ? null : fromDb(row.approved_at),
        }));
    },

    exportArchive(): ArchiveExportRow[] {
      return selectApproved
        .all()
        .map((raw) => RowSchema.parse(raw))
        .map((row) => ({
          publicId: row.public_id,
          body: row.body,
          paint: row.paint,
          locale: row.locale,
          approvedAt: approvedAtOf(row),
        }));
    },

    deleteByPublicId: (publicId) => deleteByPublic.run(publicId).changes === 1,
    purgePending: () => deleteAllPending.run().changes,

    ping: () => {
      db.prepare('SELECT 1').get();
    },
  };
}
