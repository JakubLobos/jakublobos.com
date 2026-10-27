import { describe, expect, it } from 'vitest';
import type { ApiResult } from './api/client.ts';
import {
  fieldErrorMessage,
  fillTemplate,
  firstInvalidField,
  keepsRequestId,
  resolveRequestId,
  submitOutcome,
  validateContact,
  visibleErrors,
  type ErrorVisibility,
} from './contact-form.ts';

const valid = { name: 'Jane Doe', email: 'jane@company.com', message: 'I would love to talk.' };
const untouched: ErrorVisibility = {
  touched: { name: false, email: false, message: false },
  tried: false,
};

describe('validateContact', () => {
  it('accepts valid input and judges the trimmed text', () => {
    expect(validateContact(valid)).toEqual({});
    expect(validateContact({ ...valid, name: ' J ' }).name).toEqual(['too_short']);
  });
});

describe('visibleErrors', () => {
  const client = validateContact({ name: '', email: 'nope', message: '' });

  it('shows nothing until a field was blurred non-empty or a submit was attempted', () => {
    expect(visibleErrors(client, {}, untouched)).toEqual({});
    const touched = { ...untouched, touched: { ...untouched.touched, email: true } };
    expect(visibleErrors(client, {}, touched)).toEqual({ email: ['invalid'] });
    expect(Object.keys(visibleErrors(client, {}, { ...untouched, tried: true }))).toEqual([
      'name',
      'email',
      'message',
    ]);
  });

  it('lets server errors show without a blur and override the client ones', () => {
    expect(visibleErrors({}, { message: ['invalid_characters'] }, untouched)).toEqual({
      message: ['invalid_characters'],
    });
    expect(
      visibleErrors(client, { email: ['too_long'] }, { ...untouched, tried: true }).email,
    ).toEqual(['too_long']);
  });
});

describe('firstInvalidField', () => {
  it('follows DOM order', () => {
    expect(firstInvalidField({ message: ['too_short'], email: ['invalid'] })).toBe('email');
    expect(firstInvalidField({})).toBeNull();
  });
});

describe('fieldErrorMessage', () => {
  const copy = { too_short: 'short', too_long: 'long' };

  it('uses the first code with text and falls back for codes the field has no text for', () => {
    expect(fieldErrorMessage(copy, ['too_long'])).toBe('long');
    expect(fieldErrorMessage(copy, ['links_not_allowed'])).toBe('short');
    expect(fieldErrorMessage({ invalid: 'bad' }, ['empty'])).toBe('bad');
    expect(fieldErrorMessage({}, ['empty'])).toBe('');
  });
});

describe('fillTemplate', () => {
  it('replaces known placeholders only', () => {
    expect(fillTemplate('Hi {email}, {other}', { email: 'a@b.cc' })).toBe('Hi a@b.cc, {other}');
  });
});

describe('submitOutcome', () => {
  const failed = (result: Exclude<ApiResult<unknown>, { ok: true }>) => submitOutcome(result);

  it('maps every API result to a UI outcome', () => {
    expect(submitOutcome({ ok: true, data: { status: 'sent' } })).toEqual({ kind: 'sent' });
    expect(failed({ ok: false, kind: 'rate_limited', retryAfterSeconds: 60 })).toEqual({
      kind: 'rate_limited',
    });
    for (const kind of ['unavailable', 'network', 'unexpected'] as const) {
      expect(failed({ ok: false, kind })).toEqual({ kind: 'failure' });
    }
  });

  it('maps 422 to the form fields it names, without a generic fallback', () => {
    expect(
      failed({
        ok: false,
        kind: 'validation',
        fields: { email: ['invalid'], clientRequestId: ['invalid'], name: [] },
      }),
    ).toEqual({ kind: 'fields', fields: { email: ['invalid'] } });
  });

  it('treats a 422 about unknown fields only as a failure', () => {
    expect(
      failed({ ok: false, kind: 'validation', fields: { clientRequestId: ['invalid'] } }),
    ).toEqual({ kind: 'failure' });
  });
});

describe('request id lifecycle', () => {
  let counter = 0;
  const newId = () => `id-${String(++counter)}`;

  it('reuses the id for an unchanged payload and issues a new one for edited text', () => {
    const first = resolveRequestId(null, valid, newId);
    expect(resolveRequestId(first, { ...valid }, newId)).toBe(first);
    const edited = resolveRequestId(
      first,
      { ...valid, message: 'Something else entirely.' },
      newId,
    );
    expect(edited.id).not.toBe(first.id);
  });

  it('keeps the id only after an uncertain failure', () => {
    expect(keepsRequestId({ kind: 'failure' })).toBe(true);
    expect(keepsRequestId({ kind: 'sent' })).toBe(false);
    expect(keepsRequestId({ kind: 'rate_limited' })).toBe(false);
    expect(keepsRequestId({ kind: 'fields', fields: { name: ['too_short'] } })).toBe(false);
  });
});
