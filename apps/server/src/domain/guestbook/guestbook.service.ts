import {
  checkGuestbookBody,
  DEFAULT_LOCALE,
  type FieldErrorCode,
  type Locale,
  type PaintId,
} from '@portfolio/contracts';
import type { Clock } from '../shared/clock.ts';
import type { IdGenerator } from '../shared/ids.ts';
import { findBlockedTerm } from './blocked-terms.ts';
import { contentHash, type Hasher } from './normalize.ts';
import { checkQuality } from './quality-rules.ts';
import type { ApprovedMessage, GuestbookRepository } from './repository.port.ts';
import type { GuestbookLogger, RecentRejections, ReviewWorker } from './review-worker.ts';

export interface GuestbookSubmission {
  readonly body: string;
  readonly paint: PaintId;
  readonly clientRequestId: string;
  readonly locale?: Locale | undefined;
  readonly website?: string | undefined;
}

export type SubmitOutcome =
  /** Stored for review, or silently dropped: callers must not be able to tell which. */
  | { readonly kind: 'accepted' }
  | { readonly kind: 'invalid'; readonly fields: { readonly body: readonly FieldErrorCode[] } }
  | { readonly kind: 'busy'; readonly retryAfterSeconds: number };

/** Structural match for the global caps built in the HTTP layer; keeps `domain/` free of it. */
export interface GuestbookCap {
  consume(): { readonly ok: true } | { readonly ok: false; readonly retryAfterSeconds: number };
}

export interface GuestbookService {
  /** `ctx.log` is the request-scoped logger, so drops can be correlated by request id. */
  submit(submission: GuestbookSubmission, ctx: { readonly log: GuestbookLogger }): SubmitOutcome;
  latest(): ApprovedMessage | null;
}

export interface GuestbookServiceDeps {
  readonly repo: GuestbookRepository;
  readonly worker: Pick<ReviewWorker, 'nudge'>;
  readonly hasher: Hasher;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly cap: GuestbookCap;
  readonly recentRejections: RecentRejections;
}

export function createGuestbookService(deps: GuestbookServiceDeps): GuestbookService {
  return {
    submit(submission, { log }) {
      // 1. Rules the visitor can act on. Text is validated before any hidden filter runs.
      const { normalized, errors } = checkGuestbookBody(submission.body);
      if (errors.length > 0) return { kind: 'invalid', fields: { body: errors } };

      // 2. Everything below answers like a success, so the filters cannot be probed.
      const drop = (reason: string): SubmitOutcome => {
        log.info({ event: 'dropped', reason }, 'guestbook submission dropped');
        return { kind: 'accepted' };
      };
      if ((submission.website ?? '').trim() !== '') return drop('honeypot');

      const cap = deps.cap.consume();
      if (!cap.ok) return { kind: 'busy', retryAfterSeconds: cap.retryAfterSeconds };

      const quality = checkQuality(normalized);
      if (!quality.ok) return drop(quality.rule);
      // Logs the fact of a hit, never the term or the text.
      if (findBlockedTerm(normalized) !== null) return drop('blocked_term');

      const hash = contentHash(normalized, deps.hasher);
      if (deps.recentRejections.has(hash)) return drop('recently_rejected');

      const inserted = deps.repo.insertPendingNewestWins({
        publicId: deps.ids.next(),
        clientRequestId: submission.clientRequestId,
        body: normalized,
        paint: submission.paint,
        locale: submission.locale ?? DEFAULT_LOCALE,
        contentHash: hash,
        now: deps.clock.now(),
      });
      if (inserted.kind === 'duplicate') return drop('duplicate');

      if (inserted.supersededCount > 0) {
        log.info({ event: 'superseded', count: inserted.supersededCount }, 'guestbook superseded');
      }
      deps.worker.nudge();
      return { kind: 'accepted' };
    },
    latest: () => deps.repo.findLatestApproved(),
  };
}
