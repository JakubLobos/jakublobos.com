import {
  normalizeContactInput,
  validateContactInput,
  type ContactFieldErrors,
  type ContactInput,
  type FieldErrorCode,
} from '@portfolio/contracts';
import type { ApiResult } from './api/client.ts';

export type ContactField = keyof ContactInput;

/** DOM order, which is also the focus order for "first invalid field". */
export const CONTACT_FIELDS: readonly ContactField[] = ['name', 'email', 'message'];

export type FieldCopy = Readonly<Partial<Record<FieldErrorCode, string>>>;

export interface ErrorVisibility {
  /** Fields that were left non-empty and blurred at least once. */
  touched: Readonly<Record<ContactField, boolean>>;
  /** A submit was attempted since the last reset. */
  tried: boolean;
}

/** Same normalization and rules as the server, so the client never disagrees about validity. */
export function validateContact(values: ContactInput): ContactFieldErrors {
  return validateContactInput(normalizeContactInput(values));
}

/**
 * Server errors win until the visitor edits that field; client errors appear only once the field
 * was blurred non-empty or a submit was attempted (the prototype's timing).
 */
export function visibleErrors(
  client: ContactFieldErrors,
  server: ContactFieldErrors,
  visibility: ErrorVisibility,
): ContactFieldErrors {
  const shown: ContactFieldErrors = {};
  for (const field of CONTACT_FIELDS) {
    const revealed = visibility.tried || visibility.touched[field];
    const codes = server[field] ?? (revealed ? client[field] : undefined);
    if (codes && codes.length > 0) shown[field] = codes;
  }
  return shown;
}

export function firstInvalidField(errors: ContactFieldErrors): ContactField | null {
  return CONTACT_FIELDS.find((field) => (errors[field]?.length ?? 0) > 0) ?? null;
}

// The server can send codes a field has no text for; those read as the field's general
// "not right" message.
const FALLBACK_CODES: readonly FieldErrorCode[] = ['too_short', 'invalid'];

export function fieldErrorMessage(copy: FieldCopy, codes: readonly FieldErrorCode[]): string {
  for (const code of [...codes, ...FALLBACK_CODES]) {
    const text = copy[code];
    if (text !== undefined) return text;
  }
  return '';
}

export function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export type SubmitOutcome =
  | { kind: 'sent' }
  | { kind: 'fields'; fields: ContactFieldErrors }
  | { kind: 'rate_limited' }
  | { kind: 'failure' };

/** A 422 naming only fields the form lacks (e.g. `clientRequestId`) is a failure, not field errors. */
export function submitOutcome(result: ApiResult<unknown>): SubmitOutcome {
  if (result.ok) return { kind: 'sent' };
  if (result.kind === 'rate_limited') return { kind: 'rate_limited' };
  if (result.kind !== 'validation') return { kind: 'failure' };

  const fields: ContactFieldErrors = {};
  for (const field of CONTACT_FIELDS) {
    const codes = result.fields[field];
    if (codes && codes.length > 0) fields[field] = codes;
  }
  return firstInvalidField(fields) ? { kind: 'fields', fields } : { kind: 'failure' };
}

export interface PendingRequest {
  id: string;
  /** The normalized payload the id was issued for. */
  fingerprint: string;
}

/**
 * Keeps the id of an attempt that may have reached the server (network error, 5xx) so a retry is
 * deduplicated by the API's idempotency key, but never for edited text: the mail provider rejects
 * a reused key with a different body.
 */
export function resolveRequestId(
  pending: PendingRequest | null,
  normalized: ContactInput,
  newId: () => string,
): PendingRequest {
  const fingerprint = JSON.stringify(normalized);
  return pending?.fingerprint === fingerprint ? pending : { id: newId(), fingerprint };
}

/** After a definitive answer the id is spent; only an uncertain failure may be retried under it. */
export function keepsRequestId(outcome: SubmitOutcome): boolean {
  return outcome.kind === 'failure';
}
