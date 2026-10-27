import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../domain/shared/clock.ts';
import {
  captureLogger,
  createFetchStub,
  hangUntilAborted,
  jsonResponse,
  type FetchHandler,
} from '../review/test-kit.ts';
import { GeminiSuitabilityReviewer } from './gemini-suitability.reviewer.ts';
import { DEVELOPER_INSTRUCTIONS } from './prompt.ts';

const SECRET_KEY = 'AIza-test-secret-key';
const VISITOR_TEXT = 'private visitor words';

function setup(handler: FetchHandler) {
  const stub = createFetchStub(handler);
  const logs = captureLogger();
  const reviewer = new GeminiSuitabilityReviewer({
    apiKey: SECRET_KEY,
    model: 'gemini-3.5-flash-lite',
    timeoutMs: 10_000,
    fetch: stub.fetch,
    clock: new FakeClock(),
    logger: logs.logger,
  });
  return { reviewer, calls: stub.calls, logs };
}

const reply = (text: string, finishReason = 'STOP') => ({
  candidates: [{ finishReason, content: { parts: [{ text }] } }],
});
const verdict = (v: string, reason: string) => reply(JSON.stringify({ verdict: v, reason }));

afterEach(() => {
  vi.useRealTimers();
});

describe('GeminiSuitabilityReviewer', () => {
  it('sends a header-keyed, schema-constrained, deterministic request', async () => {
    const { reviewer, calls } = setup(() => jsonResponse(verdict('approve', 'ok')));
    await reviewer.review(VISITOR_TEXT, 'en');
    expect(calls[0]?.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    );
    expect(calls[0]?.url).not.toContain(SECRET_KEY);
    expect(calls[0]?.headers['x-goog-api-key']).toBe(SECRET_KEY);
    expect(calls[0]?.body).toMatchObject({
      systemInstruction: { parts: [{ text: DEVELOPER_INSTRUCTIONS }] },
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 256,
        responseMimeType: 'application/json',
        responseSchema: { type: 'object', required: ['verdict', 'reason'] },
      },
    });
    expect(JSON.stringify(calls[0]?.body)).toContain('<visitor_note>');
  });

  it.each([
    ['approve', verdict('approve', 'ok'), { kind: 'ok', verdict: 'approve', reason: 'ok' }],
    [
      'reject',
      verdict('reject', 'spam_or_ads'),
      { kind: 'ok', verdict: 'reject', reason: 'spam_or_ads' },
    ],
    [
      'approve with a rejection reason',
      verdict('approve', 'spam_or_ads'),
      { kind: 'ok', verdict: 'reject', reason: 'spam_or_ads' },
    ],
    [
      'prompt block',
      { promptFeedback: { blockReason: 'SAFETY' } },
      { kind: 'ok', verdict: 'reject', reason: 'other' },
    ],
    [
      'safety stop',
      { candidates: [{ finishReason: 'SAFETY' }] },
      { kind: 'ok', verdict: 'reject', reason: 'other' },
    ],
    ['max tokens', reply('{"verdict":', 'MAX_TOKENS'), { kind: 'transient', code: 'incomplete' }],
    ['schema-invalid', verdict('maybe', 'ok'), { kind: 'transient', code: 'invalid_response' }],
    ['non-JSON text', reply('hello'), { kind: 'transient', code: 'invalid_response' }],
    ['no candidates', {}, { kind: 'transient', code: 'invalid_response' }],
  ])('maps %s', async (_name, body, expected) => {
    const { reviewer } = setup(() => jsonResponse(body));
    expect(await reviewer.review(VISITOR_TEXT, null)).toEqual(expected);
  });

  it.each([
    [400, 'bad_request'],
    [401, 'auth'],
    [403, 'auth'],
    [429, 'rate_limited'],
    [500, 'provider_error'],
    [503, 'provider_error'],
  ])('maps HTTP %i to %s', async (status, code) => {
    const { reviewer } = setup(() => jsonResponse({ error: 'x' }, status));
    expect(await reviewer.review(VISITOR_TEXT, 'en')).toEqual({ kind: 'transient', code });
  });

  it('keeps Retry-After seconds on 429', async () => {
    const { reviewer } = setup(() => jsonResponse({}, 429, { 'retry-after': '7' }));
    expect(await reviewer.review(VISITOR_TEXT, 'en')).toEqual({
      kind: 'transient',
      code: 'rate_limited',
      retryAfterSeconds: 7,
    });
  });

  it('maps a network failure to network and a hung request to timeout', async () => {
    const down = setup(() => Promise.reject(new TypeError('fetch failed')));
    expect(await down.reviewer.review(VISITOR_TEXT, 'en')).toEqual({
      kind: 'transient',
      code: 'network',
    });

    vi.useFakeTimers();
    const hung = setup(hangUntilAborted);
    const pending = hung.reviewer.review(VISITOR_TEXT, 'en');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await pending).toEqual({ kind: 'transient', code: 'timeout' });
  });

  it('never logs the visitor text or the key', async () => {
    const { reviewer, logs } = setup(() => jsonResponse({ error: VISITOR_TEXT }, 403));
    await reviewer.review(VISITOR_TEXT, 'en');
    const output = logs.output();
    expect(output).not.toContain(VISITOR_TEXT);
    expect(output).not.toContain(SECRET_KEY);
    expect(JSON.parse(output.trim())).toMatchObject({
      level: 50,
      provider: 'gemini-suitability',
      outcome: 'auth',
    });
  });
});
