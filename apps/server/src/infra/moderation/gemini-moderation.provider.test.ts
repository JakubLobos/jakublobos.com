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

const CLEAN = { harassment: 0, hate: 0, sexual: 0, dangerous: 0, self_harm: 0, spam: 0 };
const classified = (scores: Record<string, number>, extra: object = {}) => ({
  candidates: [
    {
      finishReason: 'STOP',
      content: { parts: [{ text: JSON.stringify({ ...CLEAN, ...scores }) }] },
    },
  ],
  ...extra,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GeminiModerationProvider', () => {
  it('sends a header-keyed classification request with minimal thinking', async () => {
    const { provider, calls } = setup(() => jsonResponse(classified({})));
    await provider.moderate(VISITOR_TEXT);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    );
    expect(calls[0]?.url).not.toContain(SECRET_KEY);
    expect(calls[0]?.headers['x-goog-api-key']).toBe(SECRET_KEY);
    expect(calls[0]?.headers.authorization).toBeUndefined();
    expect(calls[0]?.body).toMatchObject({
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 512,
        thinkingConfig: { thinkingLevel: 'minimal' },
        responseMimeType: 'application/json',
        responseSchema: { type: 'object' },
      },
      safetySettings: expect.arrayContaining([
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      ]) as unknown,
    });
    expect(JSON.stringify(calls[0]?.body)).toContain('<visitor_note>');
  });

  const decide = async (body: unknown) => {
    const { provider } = setup(() => jsonResponse(body));
    const outcome = await provider.moderate(VISITOR_TEXT);
    if (outcome.kind !== 'ok') throw new Error('should be ok');
    return { outcome, decision: decideModeration(outcome, 0.2).decision };
  };

  it('approves a clean classification and rejects a high score', async () => {
    const clean = await decide(classified({}));
    expect(clean).toMatchObject({ decision: 'approve', outcome: { flagged: false } });
    const rude = await decide(classified({ harassment: 0.8 }));
    expect(rude.decision).toBe('reject');
  });

  it('flags a prompt blockReason or a safety finishReason even without a verdict', async () => {
    for (const body of [
      { promptFeedback: { blockReason: 'SAFETY' } },
      { candidates: [{ finishReason: 'PROHIBITED_CONTENT' }] },
    ]) {
      const { outcome, decision } = await decide(body);
      expect(outcome).toMatchObject({ flagged: true });
      expect(decision).toBe('reject');
    }
  });

  it('merges safety ratings by max; LOW stays under the threshold, MEDIUM crosses it', async () => {
    const rate = (probability: string) =>
      classified(
        { harassment: 0.05 },
        {
          promptFeedback: {
            safetyRatings: [{ category: 'HARM_CATEGORY_HARASSMENT', probability }],
          },
        },
      );
    const low = await decide(rate('LOW'));
    expect(low.outcome).toMatchObject({ scores: { harassment: 0.1 } });
    expect(low.decision).toBe('approve');
    const medium = await decide(rate('MEDIUM'));
    expect(medium.outcome).toMatchObject({ scores: { harassment: 0.6 } });
    expect(medium.decision).toBe('reject');

    const fromCandidate = await decide({
      candidates: [
        {
          content: { parts: [{ text: JSON.stringify(CLEAN) }] },
          safetyRatings: [{ category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'HIGH' }],
        },
      ],
    });
    expect(fromCandidate.outcome).toMatchObject({ scores: { hate: 0.9 } });
  });

  it.each([
    ['no candidates', {}],
    ['non-JSON text', { candidates: [{ content: { parts: [{ text: 'hello' }] } }] }],
    ['score out of range', classified({ hate: 7 })],
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
