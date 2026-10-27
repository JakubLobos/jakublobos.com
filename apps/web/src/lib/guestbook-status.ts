import { SUBMISSION_REASONS, type PaintId, type SubmissionReason } from '@portfolio/contracts';
import type { ApiResult } from './api/client.ts';
import type { GuestbookStatusData } from './api/guestbook.ts';
import { isPaintId } from './guestbook-paint.ts';

/** Fired on `document` when a note is approved, so the quote behind the modal refetches. */
export const APPROVED_EVENT = 'guestbook:approved';

/** Waits before the 1st, 2nd and 3rd poll; every later poll waits `POLL_STEADY_MS`. */
export const POLL_DELAYS_MS = [1_500, 2_000, 3_000] as const;
export const POLL_STEADY_MS = 5_000;
/** After this long without a result the modal says it is taking longer and polling stops. */
export const POLL_BUDGET_MS = 60_000;

/**
 * Milliseconds to wait before the next poll, or `null` once the budget is spent. `attempt` is the
 * number of polls already made; the last wait is shortened so a final poll lands on the budget.
 */
export function pollDelay(attempt: number, elapsedMs: number): number | null {
  const remaining = POLL_BUDGET_MS - elapsedMs;
  if (remaining <= 0) return null;
  const wanted = POLL_DELAYS_MS[attempt] ?? POLL_STEADY_MS;
  return Math.min(wanted, remaining);
}

export type StatusView =
  | { state: 'approved' }
  | { state: 'rejected'; reason: SubmissionReason }
  | { state: 'superseded' }
  | { state: 'slow' };

export type StatusStep = { kind: 'continue' } | { kind: 'done'; view: StatusView };

/**
 * One poll answer to the next step. Transient failures (network, 5xx, rate limit) just wait for
 * the next scheduled poll; an unknown token (404) cannot get better, so it ends like a timeout.
 */
export function toStatusStep(result: ApiResult<GuestbookStatusData>): StatusStep {
  if (!result.ok) {
    return result.kind === 'not_found'
      ? { kind: 'done', view: { state: 'slow' } }
      : { kind: 'continue' };
  }
  const { status, reason } = result.data;
  switch (status) {
    case 'pending':
      return { kind: 'continue' };
    case 'approved':
      return { kind: 'done', view: { state: 'approved' } };
    case 'superseded':
      return { kind: 'done', view: { state: 'superseded' } };
    case 'rejected':
      return { kind: 'done', view: { state: 'rejected', reason: reason ?? 'inappropriate' } };
  }
}

export interface StatusCopy {
  eyebrow: string;
  title: string;
  body: string;
}

/** The modal's localized texts; the component serializes them into `data-messages`. */
export interface StatusMessages {
  checking: StatusCopy;
  approved: StatusCopy;
  superseded: StatusCopy;
  slow: StatusCopy;
  rejected: { eyebrow: string; title: string; reasons: Record<SubmissionReason, string> };
}

function isCopy(value: unknown): value is StatusCopy {
  return (
    typeof value === 'object' &&
    value !== null &&
    'eyebrow' in value &&
    typeof value.eyebrow === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'body' in value &&
    typeof value.body === 'string'
  );
}

function isRejected(value: unknown): value is StatusMessages['rejected'] {
  if (typeof value !== 'object' || value === null) return false;
  if (!('eyebrow' in value) || typeof value.eyebrow !== 'string') return false;
  if (!('title' in value) || typeof value.title !== 'string') return false;
  if (!('reasons' in value) || typeof value.reasons !== 'object' || value.reasons === null) {
    return false;
  }
  const reasons = value.reasons;
  return SUBMISSION_REASONS.every(
    (reason) => reason in reasons && typeof Reflect.get(reasons, reason) === 'string',
  );
}

export function parseStatusMessages(raw: string | undefined): StatusMessages | null {
  if (raw === undefined) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const checking: unknown = Reflect.get(value, 'checking');
  const approved: unknown = Reflect.get(value, 'approved');
  const superseded: unknown = Reflect.get(value, 'superseded');
  const slow: unknown = Reflect.get(value, 'slow');
  const rejected: unknown = Reflect.get(value, 'rejected');
  return isCopy(checking) &&
    isCopy(approved) &&
    isCopy(superseded) &&
    isCopy(slow) &&
    isRejected(rejected)
    ? { checking, approved, superseded, slow, rejected }
    : null;
}

/** The text block for the modal's current state; `null` means still checking. */
export function copyFor(messages: StatusMessages, view: StatusView | null): StatusCopy {
  if (view === null) return messages.checking;
  switch (view.state) {
    case 'approved':
      return messages.approved;
    case 'superseded':
      return messages.superseded;
    case 'slow':
      return messages.slow;
    case 'rejected':
      return {
        eyebrow: messages.rejected.eyebrow,
        title: messages.rejected.title,
        body: messages.rejected.reasons[view.reason],
      };
  }
}

/** What survives a reload: just enough to keep watching. The note's text is never stored. */
export interface StoredSubmission {
  token: string;
  sentAt: number;
  tint: PaintId;
}

export const STORAGE_KEY = 'guestbook:submission';
/** Older than this, a reload no longer resumes polling. */
export const RESUME_WINDOW_MS = 120_000;

export function serializeSubmission(stored: StoredSubmission): string {
  return JSON.stringify(stored);
}

/** Returns the stored submission only if it is well-formed and fresh enough to resume. */
export function parseStoredSubmission(raw: string | null, now: number): StoredSubmission | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const token = 'token' in value ? value.token : undefined;
  const sentAt = 'sentAt' in value ? value.sentAt : undefined;
  const tint = 'tint' in value ? value.tint : undefined;
  if (typeof token !== 'string' || typeof sentAt !== 'number' || !isPaintId(tint)) return null;
  const age = now - sentAt;
  return age >= 0 && age < RESUME_WINDOW_MS ? { token, sentAt, tint } : null;
}
