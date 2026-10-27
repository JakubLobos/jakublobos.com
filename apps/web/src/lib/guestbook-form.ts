import {
  checkGuestbookBody,
  GUESTBOOK_MESSAGE_MAX_LENGTH,
  type FieldErrorCode,
  type GuestbookSubmitRequest,
  type Locale,
  type PaintId,
} from '@portfolio/contracts';
import type { ApiResult } from './api/client.ts';
import type { GuestbookSubmitData } from './api/guestbook.ts';

/** `too_short` has no guestbook rule, so the UI has no copy for it. */
export type BodyErrorCode = Exclude<FieldErrorCode, 'too_short'>;

export type SubmitOutcome =
  /** A request is already in flight (double click or Enter while sending). */
  | { kind: 'ignored' }
  /** Trimmed-empty input: focus the field, no message, no request. */
  | { kind: 'empty' }
  | { kind: 'field-error'; code: BodyErrorCode }
  | { kind: 'failed'; reason: 'rate_limited' | 'retry' }
  | { kind: 'sent'; body: string; paint: PaintId; clientRequestId: string };

export interface SubmitInput {
  raw: string;
  paint: PaintId;
  locale: Locale;
  /** The honeypot field's value; always sent so the server can see it. */
  website: string;
}

export interface SubmitDeps {
  send: (request: GuestbookSubmitRequest) => Promise<ApiResult<GuestbookSubmitData>>;
  newId: () => string;
  /** Fires only for requests that actually start (not for empty or invalid text). */
  onBusyChange: (busy: boolean) => void;
}

function isBodyCode(code: FieldErrorCode): code is BodyErrorCode {
  return code !== 'too_short';
}

export type SubmissionCheck =
  { kind: 'ok'; body: string } | { kind: 'empty' } | { kind: 'invalid'; code: BodyErrorCode };

/** Client-side validation. Only `checkGuestbookBody` is used so the web and the API can't disagree. */
export function checkSubmission(raw: string): SubmissionCheck {
  const { normalized, errors } = checkGuestbookBody(raw);
  // Only 'empty' means the visitor typed nothing; an input that normalizes to empty because of a
  // stripped character also carries 'invalid_characters' and deserves a message.
  const first = errors.find((code): code is BodyErrorCode => isBodyCode(code) && code !== 'empty');
  if (first) return { kind: 'invalid', code: first };
  return errors.includes('empty') ? { kind: 'empty' } : { kind: 'ok', body: normalized };
}

function toOutcome(
  result: ApiResult<GuestbookSubmitData>,
  body: string,
  paint: PaintId,
  clientRequestId: string,
): SubmitOutcome {
  if (result.ok) return { kind: 'sent', body, paint, clientRequestId };
  switch (result.kind) {
    case 'validation': {
      const code = result.fields.body?.find(isBodyCode);
      // A rejected paint or id is not something the visitor can fix, so it reads as a failure.
      return code ? { kind: 'field-error', code } : { kind: 'failed', reason: 'retry' };
    }
    case 'rate_limited':
      return { kind: 'failed', reason: 'rate_limited' };
    case 'not_found':
    case 'unavailable':
    case 'network':
    case 'unexpected':
      return { kind: 'failed', reason: 'retry' };
  }
}

export interface SubmitController {
  submit: (input: SubmitInput) => Promise<SubmitOutcome>;
}

/**
 * One submission at a time. The `clientRequestId` is kept while the same text and paint are
 * retried (so a retry after a lost response is idempotent) and replaced once either changes or
 * after a success.
 */
export function createSubmitController(deps: SubmitDeps): SubmitController {
  let busy = false;
  let current: { key: string; id: string } | null = null;

  return {
    async submit({ raw, paint, locale, website }) {
      if (busy) return { kind: 'ignored' };
      const check = checkSubmission(raw);
      if (check.kind === 'empty') return check;
      if (check.kind === 'invalid') return { kind: 'field-error', code: check.code };

      const key = `${paint}\n${check.body}`;
      if (current?.key !== key) current = { key, id: deps.newId() };

      busy = true;
      deps.onBusyChange(true);
      try {
        const result = await deps.send({
          body: check.body,
          paint,
          clientRequestId: current.id,
          locale,
          website,
        });
        const outcome = toOutcome(result, check.body, paint, current.id);
        if (outcome.kind === 'sent') current = null;
        return outcome;
      } finally {
        busy = false;
        deps.onBusyChange(false);
      }
    },
  };
}

export const BODY_ERROR_CODES = [
  'required',
  'empty',
  'invalid',
  'too_long',
  'invalid_characters',
  'links_not_allowed',
  'contact_info_not_allowed',
] as const satisfies readonly BodyErrorCode[];

/** The localized strings the script needs at runtime; the component serializes them (`data-messages`). */
export interface FormMessages {
  fieldErrors: Record<BodyErrorCode, string>;
  rateLimited: string;
  retry: string;
  /** Contains `{n}`. */
  charsLeft: string;
  limitReached: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFieldErrors(value: unknown): value is Record<BodyErrorCode, string> {
  return isRecord(value) && BODY_ERROR_CODES.every((code) => typeof value[code] === 'string');
}

/** Parses and validates the `data-messages` attribute; `null` means the markup is unusable. */
export function parseFormMessages(raw: string | undefined): FormMessages | null {
  if (raw === undefined) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const { fieldErrors, rateLimited, retry, charsLeft, limitReached } = value;
  return isFieldErrors(fieldErrors) &&
    typeof rateLimited === 'string' &&
    typeof retry === 'string' &&
    typeof charsLeft === 'string' &&
    typeof limitReached === 'string'
    ? { fieldErrors, rateLimited, retry, charsLeft, limitReached }
    : null;
}

/** Lengths at which the polite live region speaks; the visual counter is silent. */
export const ANNOUNCE_AT = [100, 110, GUESTBOOK_MESSAGE_MAX_LENGTH] as const;

/** Characters left to announce when typing crosses a threshold, else `null` (no chatter). */
export function remainingToAnnounce(previousLength: number, length: number): number | null {
  const crossed = ANNOUNCE_AT.findLast((at) => previousLength < at && length >= at);
  return crossed === undefined ? null : GUESTBOOK_MESSAGE_MAX_LENGTH - crossed;
}
