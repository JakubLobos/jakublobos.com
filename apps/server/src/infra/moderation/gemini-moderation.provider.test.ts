import { afterEach, describe, expect, it, vi } from 'vitest';
import { decideModeration } from '../../domain/guestbook/moderation-policy.ts';
import { FakeClock } from '../../domain/shared/clock.ts';
import {
  captureLogger,
  createFetchStub,
  hangUntilAborted,
  jsonResponse,
  type FetchHandler,
} from '../review/test-kit.ts';
import { GeminiModerationProvider } from './gemini-moderation.provider.ts';

const SECRET_KEY = 'AIza-test-secret-key';
const VISITOR_TEXT = 'private visitor words';

function setup(handler: FetchHandler) {
  const stub = createFetchStub(handler);
  const logs = captureLogger();
  const provider = new GeminiModerationProvider({
    apiKey: SECRET_KEY,
    model: 'gemini-3.5-flash-lite',
    timeoutMs: 5000,
    fetch: stub.fetch,
    clock: new FakeClock(),
    logger: logs.logger,
  });
  return { provider, calls: stub.calls, logs };
}

const ratings = (probability: string, harassment = probability) => ({
  promptFeedback: {
    safetyRatings: [
      { category: 'HARM_CATEGORY_HARASSMENT', probability: harassment },
      { category: 'HARM_CATEGORY_HATE_SPEECH', probability },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability },
    ],
  },
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GeminiModerationProvider', () => {
  it('sends the key only in a header, with BLOCK_NONE safety settings', async () => {
    const { provider, calls } = setup(() => jsonResponse(ratings('NEGLIGIBLE')));
    await provider.moderate(VISITOR_TEXT);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    );
    expect(calls[0]?.url).not.toContain(SECRET_KEY);
    expect(calls[0]?.headers['x-goog-api-key']).toBe(SECRET_KEY);
    expect(calls[0]?.headers.authorization).toBeUndefined();
    expect(calls[0]?.body).toMatchObject({
      contents: [{ role: 'user', parts: [{ text: VISITOR_TEXT }] }],
      safetySettings: expect.arrayContaining([
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      ]) as unknown,
    });
  });

  it('maps probabilities to scores and hands them to the 0.2 policy', async () => {
    const decide = async (body: unknown) => {
      const { provider } = setup(() => jsonResponse(body));
      const outcome = await provider.moderate(VISITOR_TEXT);
      if (outcome.kind !== 'ok') throw new Error('should be ok');
      return { outcome, decision: decideModeration(outcome, 0.2).decision };
    };
    const clean = await decide(ratings('NEGLIGIBLE'));
    expect(clean.outcome).toMatchObject({ flagged: false, scores: { harassment: 0 } });
    expect(clean.decision).toBe('approve');

    const low = await decide(ratings('NEGLIGIBLE', 'LOW'));
    expect(low.outcome).toMatchObject({ scores: { harassment: 0.25, hate_speech: 0 } });
    expect(low.decision).toBe('reject');

    const high = await decide(ratings('HIGH'));
    expect(high.outcome).toMatchObject({ scores: { sexually_explicit: 0.9 } });
    expect((await decide(ratings('MEDIUM'))).outcome).toMatchObject({
      scores: { dangerous_content: 0.6 },
    });
    expect(high.decision).toBe('reject');
  });

  it('flags a prompt blockReason and rejects it', async () => {
    const { provider } = setup(() => jsonResponse({ promptFeedback: { blockReason: 'SAFETY' } }));
    const outcome = await provider.moderate(VISITOR_TEXT);
    expect(outcome).toMatchObject({ kind: 'ok', flagged: true });
    if (outcome.kind !== 'ok') throw new Error('should be ok');
    expect(decideModeration(outcome, 0.2).decision).toBe('reject');
  });

  it.each([
    ['no ratings', {}],
    ['unknown probability', ratings('HARM_PROBABILITY_UNSPECIFIED')],
    ['wrong shape', { promptFeedback: 'x' }],
  ])('maps %s to invalid_response', async (_name, body) => {
    const { provider } = setup(() => jsonResponse(body));
    expect(await provider.moderate(VISITOR_TEXT)).toEqual({
      kind: 'transient',
      code: 'invalid_response',
    });
  });

  it('maps a non-JSON 200 body to invalid_response', async () => {
    const { provider } = setup(() => jsonResponse('<html>oops</html>'));
    expect(await provider.moderate(VISITOR_TEXT)).toEqual({
      kind: 'transient',
      code: 'invalid_response',
    });
  });

  it.each([
    [400, 'bad_request'],
    [401, 'auth'],
    [403, 'auth'],
    [429, 'rate_limited'],
    [500, 'provider_error'],
    [503, 'provider_error'],
  ])('maps HTTP %i to %s', async (status, code) => {
    const { provider } = setup(() => jsonResponse({ error: 'x' }, status));
    expect(await provider.moderate(VISITOR_TEXT)).toEqual({ kind: 'transient', code });
  });

  it('keeps Retry-After seconds on 429', async () => {
    const { provider } = setup(() => jsonResponse({}, 429, { 'retry-after': '42' }));
    expect(await provider.moderate(VISITOR_TEXT)).toEqual({
      kind: 'transient',
      code: 'rate_limited',
      retryAfterSeconds: 42,
    });
  });

  it('maps a network failure to network', async () => {
    const { provider } = setup(() => Promise.reject(new TypeError('fetch failed')));
    expect(await provider.moderate(VISITOR_TEXT)).toEqual({ kind: 'transient', code: 'network' });
  });

  it('maps a hung request to timeout', async () => {
    vi.useFakeTimers();
    const { provider } = setup(hangUntilAborted);
    const pending = provider.moderate(VISITOR_TEXT);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toEqual({ kind: 'transient', code: 'timeout' });
  });

  it('never logs the visitor text or the key, but logs auth failures as errors', async () => {
    const { provider, logs } = setup(() => jsonResponse({ error: VISITOR_TEXT }, 401));
    await provider.moderate(VISITOR_TEXT);
    const output = logs.output();
    expect(output).not.toContain(VISITOR_TEXT);
    expect(output).not.toContain(SECRET_KEY);
    expect(JSON.parse(output.trim())).toMatchObject({
      level: 50,
      provider: 'gemini-moderation',
      outcome: 'auth',
      httpStatus: 401,
    });
  });
});
