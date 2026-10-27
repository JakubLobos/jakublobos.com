import type { Locale, PaintId, SubmissionReason } from '@portfolio/contracts';

// Every timestamp in this port is epoch milliseconds (the `Clock` unit).

export interface NewPendingMessage {
  readonly publicId: string;
  readonly clientRequestId: string;
  readonly body: string;
  readonly paint: PaintId;
  readonly locale: Locale | null;
  readonly contentHash: string;
  readonly now: number;
}

export type InsertResult =
  { readonly kind: 'inserted'; readonly supersededCount: number } | { readonly kind: 'duplicate' };

export interface PendingMessage {
  readonly id: number;
  readonly publicId: string;
  readonly body: string;
  readonly paint: PaintId;
  readonly locale: Locale | null;
  readonly contentHash: string;
  readonly attempts: number;
  readonly createdAt: number;
}

export interface ApprovedMessage {
  readonly publicId: string;
  readonly body: string;
  readonly paint: PaintId;
  readonly approvedAt: number;
}

export type GuestbookStatus = 'pending' | 'approved';

export interface ArchiveRow {
  readonly publicId: string;
  readonly body: string;
  readonly paint: PaintId;
  readonly locale: Locale | null;
  readonly status: GuestbookStatus;
  readonly createdAt: number;
  readonly approvedAt: number | null;
}

export interface ArchiveExportRow {
  readonly publicId: string;
  readonly body: string;
  readonly paint: PaintId;
  readonly locale: Locale | null;
  readonly approvedAt: number;
}

export type SubmissionStatusResult =
  | { readonly status: 'pending' | 'approved' | 'superseded' }
  | { readonly status: 'rejected'; readonly reason: SubmissionReason };

export interface GuestbookRepository {
  /** One IMMEDIATE transaction: dedupe, supersede the pending row, evict oldest approved, insert. */
  insertPendingNewestWins(message: NewPendingMessage): InsertResult;
  findLatestApproved(): ApprovedMessage | null;
  /** At most one row (I-7): the pending message whose `next_attempt_at` has arrived. */
  findDuePending(now: number): PendingMessage | null;
  /** Pending to approved only. False when the row was superseded, expired, or already approved. */
  approve(id: number, now: number): boolean;
  deletePending(id: number): boolean;
  /**
   * Review said no: records a text-free `rejected` outcome for the row's token, then deletes it
   * (one transaction). False when the row was superseded or expired meanwhile.
   */
  rejectPending(id: number, reason: SubmissionReason, now: number): boolean;
  /** A silently dropped submission: a text-free `rejected` outcome, nothing else is stored. */
  recordRejection(clientRequestId: string, reason: SubmissionReason, now: number): void;
  /** `null` when the token is unknown or its outcome has been pruned. */
  findSubmissionStatus(clientRequestId: string): SubmissionStatusResult | null;
  recordFailure(id: number, code: string, nextAttemptAt: number): void;
  /** Deletes pending rows (and submission outcomes) created before the cutoff; returns pending count. */
  deleteExpiredPending(createdBefore: number): number;

  listArchive(options: { status?: GuestbookStatus; limit: number }): ArchiveRow[];
  /** Approved rows, newest first. */
  exportArchive(): ArchiveExportRow[];
  deleteByPublicId(publicId: string): boolean;
  purgePending(): number;

  /** Throws if the database does not answer. */
  readonly ping: () => void;
}
