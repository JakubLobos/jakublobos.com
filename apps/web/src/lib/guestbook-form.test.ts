import type { GuestbookSubmitRequest } from '@portfolio/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { ApiResult } from './api/client.ts';
import type { GuestbookSubmitData } from './api/guestbook.ts';
import {
  BODY_ERROR_CODES,
  checkSubmission,
  createSubmitController,
  parseFormMessages,
  remainingToAnnounce,
  type SubmitInput,
} from './guestbook-form.ts';

const received: ApiResult<GuestbookSubmitData> = { ok: true, data: { status: 'received' } };

const input: SubmitInput = { raw: '  Hello   there ', paint: 'violet', locale: 'pl', website: '' };

function setup(result: ApiResult<GuestbookSubmitData> = received) {
  const send = vi.fn<(request: GuestbookSubmitRequest) => Promise<ApiResult<GuestbookSubmitData>>>(
    () => Promise.resolve(result),
  );
  let counter = 0;
  const newId = vi.fn(() => `id-${String((counter += 1))}`);
  const onBusyChange = vi.fn<(busy: boolean) => void>();
  return {
    send,
    newId,
    onBusyChange,
    controller: createSubmitController({ send, newId, onBusyChange }),
  };
}

describe('checkSubmission', () => {
  it('normalizes a valid body', () => {
    expect(checkSubmission('  Hello   there ')).toEqual({ kind: 'ok', body: 'Hello there' });
  });

  it('treats trimmed-empty input as empty, not as an error', () => {
    expect(checkSubmission(' \n\t ')).toEqual({ kind: 'empty' });
  });

  it('reports the first rule that fails', () => {
    expect(checkSubmission('visit example.com now')).toEqual({
      kind: 'invalid',
      code: 'links_not_allowed',
    });
    expect(checkSubmission('call 123 456 789')).toEqual({
      kind: 'invalid',
      code: 'contact_info_not_allowed',
    });
    expect(checkSubmission('x'.repeat(121))).toEqual({ kind: 'invalid', code: 'too_long' });
  });

  it('flags a body that only normalizes to empty because of a stripped character', () => {
    expect(checkSubmission('﻿')).toEqual({ kind: 'invalid', code: 'invalid_characters' });
  });
});

describe('createSubmitController', () => {
  it('sends the normalized body once and reports the echo for the modal', async () => {
    const { controller, send } = setup();

    await expect(controller.submit(input)).resolves.toEqual({
      kind: 'sent',
      body: 'Hello there',
      paint: 'violet',
    });
    expect(send).toHaveBeenCalledExactlyOnceWith({
      body: 'Hello there',
      paint: 'violet',
      clientRequestId: 'id-1',
      locale: 'pl',
      website: '',
    });
  });

  it('submits a double click once', async () => {
    const { controller, send, onBusyChange } = setup();

    const first = controller.submit(input);
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    await expect(controller.submit(input)).resolves.toEqual({ kind: 'ignored' });
    await first;

    expect(send).toHaveBeenCalledTimes(1);
    expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
  });

  it('makes no request and never goes busy for empty or locally invalid text', async () => {
    const { controller, send, onBusyChange } = setup();

    await expect(controller.submit({ ...input, raw: '   ' })).resolves.toEqual({ kind: 'empty' });
    await expect(controller.submit({ ...input, raw: 'see www.x.com' })).resolves.toEqual({
      kind: 'field-error',
      code: 'links_not_allowed',
    });
    expect(send).not.toHaveBeenCalled();
    expect(onBusyChange).not.toHaveBeenCalled();
  });

  it('maps a 422 to its first body code that has copy', async () => {
    const { controller } = setup({
      ok: false,
      kind: 'validation',
      fields: { body: ['too_short', 'links_not_allowed'] },
    });

    await expect(controller.submit(input)).resolves.toEqual({
      kind: 'field-error',
      code: 'links_not_allowed',
    });
  });

  it('reads a 422 without a usable body code as a retryable failure', async () => {
    const { controller } = setup({
      ok: false,
      kind: 'validation',
      fields: { paint: ['invalid'] },
    });

    await expect(controller.submit(input)).resolves.toEqual({ kind: 'failed', reason: 'retry' });
  });

  it('maps rate limiting and every transport failure', async () => {
    const limited = setup({ ok: false, kind: 'rate_limited', retryAfterSeconds: 30 });
    await expect(limited.controller.submit(input)).resolves.toEqual({
      kind: 'failed',
      reason: 'rate_limited',
    });

    for (const kind of ['unavailable', 'network', 'unexpected'] as const) {
      const { controller } = setup({ ok: false, kind });
      await expect(controller.submit(input)).resolves.toEqual({ kind: 'failed', reason: 'retry' });
    }
  });

  it('reuses the request id for a retry of the same text and paint', async () => {
    const { controller, send } = setup({ ok: false, kind: 'network' });

    await controller.submit(input);
    await controller.submit({ ...input, raw: 'Hello there' });

    expect(send.mock.calls.map(([request]) => request.clientRequestId)).toEqual(['id-1', 'id-1']);
  });

  it('issues a new request id when the text or the paint changes', async () => {
    const { controller, send } = setup({ ok: false, kind: 'network' });

    await controller.submit(input);
    await controller.submit({ ...input, raw: 'Hello again' });
    await controller.submit({ ...input, raw: 'Hello again', paint: 'blue' });

    expect(send.mock.calls.map(([request]) => request.clientRequestId)).toEqual([
      'id-1',
      'id-2',
      'id-3',
    ]);
  });

  it('issues a new request id after a success, even for the same text', async () => {
    const { controller, send } = setup();

    await controller.submit(input);
    await controller.submit(input);

    expect(send.mock.calls.map(([request]) => request.clientRequestId)).toEqual(['id-1', 'id-2']);
  });
});

describe('parseFormMessages', () => {
  const valid = {
    fieldErrors: Object.fromEntries(BODY_ERROR_CODES.map((code) => [code, `text ${code}`])),
    rateLimited: 'slow down',
    retry: 'retry',
    charsLeft: '{n} left',
    limitReached: 'limit',
  };

  it('accepts the serialized messages', () => {
    expect(parseFormMessages(JSON.stringify(valid))).toEqual(valid);
  });

  it('rejects a missing attribute, bad JSON, and any missing or non-string entry', () => {
    expect(parseFormMessages(undefined)).toBeNull();
    expect(parseFormMessages('{')).toBeNull();
    expect(parseFormMessages('[]')).toBeNull();
    expect(parseFormMessages(JSON.stringify({ ...valid, retry: 1 }))).toBeNull();
    expect(
      parseFormMessages(JSON.stringify({ ...valid, fieldErrors: { too_long: 'x' } })),
    ).toBeNull();
  });
});

describe('remainingToAnnounce', () => {
  it('stays silent below 100 characters and between thresholds', () => {
    expect(remainingToAnnounce(0, 1)).toBeNull();
    expect(remainingToAnnounce(98, 99)).toBeNull();
    expect(remainingToAnnounce(101, 102)).toBeNull();
  });

  it('announces what is left when typing crosses 100, 110 and 120', () => {
    expect(remainingToAnnounce(99, 100)).toBe(20);
    expect(remainingToAnnounce(109, 110)).toBe(10);
    expect(remainingToAnnounce(119, 120)).toBe(0);
  });

  it('announces the last threshold crossed by a paste and nothing when deleting', () => {
    expect(remainingToAnnounce(10, 115)).toBe(10);
    expect(remainingToAnnounce(120, 119)).toBeNull();
  });
});
