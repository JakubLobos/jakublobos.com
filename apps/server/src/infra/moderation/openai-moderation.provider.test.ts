import { afterEach, describe, expect, it, vi } from 'vitest';
import { decideModeration } from '../../domain/guestbook/moderation-policy.ts';
import { FakeClock } from '../../domain/shared/clock.ts';
import {
  captureLogger,
  createFetchStub,
  fixtureJson,
  hangUntilAborted,
  jsonResponse,
  type FetchHandler,
} from '../review/test-kit.ts';
import { OpenAiModerationProvider } from './openai-moderation.provider.ts';
import { FakeModerationProvider } from './fake-moderation.provider.ts';

const SECRET_KEY = 'sk-test-secret-key';
const VISITOR_TEXT = 'private visitor words';

function setup(handler: FetchHandler) {
  const stub = createFetchStub(handler);
  const logs = captureLogger();
  const provider = new OpenAiModerationProvider({
    apiKey: SECRET_KEY,
    model: 'omni-moderation-latest',
    timeoutMs: 5000,
    fetch: stub.fetch,
    clock: new FakeClock(),
    logger: logs.logger,
  });
  return { provider, calls: stub.calls, logs };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('OpenAiModerationProvider', () => {
  it('sends the model and text with a bearer key', async () => {
    const { provider, calls } = setup(() =>
      jsonResponse(fixtureJson('openai/moderation/clean.json')),
    );
    await provider.moderate(VISITOR_TEXT);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://api.openai.com/v1/moderations');
    expect(calls[0]?.headers.authorization).toBe(`Bearer ${SECRET_KEY}`);
    expect(calls[0]?.body).toEqual({ model: 'omni-moderation-latest', input: VISITOR_TEXT });
  });

  it.each([
    ['clean', false],
    ['flagged', true],
    ['high-score', false],
    ['extra-category', false],
  ])('maps the %s fixture to ok (flagged=%s)', async (name, flagged) => {
    const { provider } = setup(() => jsonResponse(fixtureJson(`openai/moderation/${name}.json`)));
    const outcome = await provider.moderate(VISITOR_TEXT);
    expect(outcome).toMatchObject({ kind: 'ok', flagged });
  });

  it('hands scores to the policy: clean approves, high-score and flagged reject', async () => {
    const decisions: Record<string, string> = {};
    for (const name of ['clean', 'high-score', 'flagged']) {
      const { provider } = setup(() => jsonResponse(fixtureJson(`openai/moderation/${name}.json`)));
      const outcome = await provider.moderate(VISITOR_TEXT);
      if (outcome.kind !== 'ok') throw new Error(`${name} should be ok`);
      const decision = decideModeration(outcome, 0.2);
      decisions[name] =
        decision.decision === 'approve' ? 'approve' : `reject:${decision.categories.join()}`;
    }
    expect(decisions).toEqual({
      clean: 'approve',
      'high-score': 'reject:hate',
      flagged: 'reject:harassment',
    });
  });

  it('cancels the unread body of a non-2xx response', async () => {
    let cancelled = false;
    const body = new ReadableStream({
      cancel() {
        cancelled = true;
      },
    });
    const { provider } = setup(() => new Response(body, { status: 500 }));
    await provider.moderate(VISITOR_TEXT);
    expect(cancelled).toBe(true);
  });

  it.each(['missing-results', 'empty-scores', 'malformed'])(
    'maps the %s fixture to invalid_response',
    async (name) => {
      const { provider } = setup(() => jsonResponse(fixtureJson(`openai/moderation/${name}.json`)));
      expect(await provider.moderate(VISITOR_TEXT)).toEqual({
        kind: 'transient',
        code: 'invalid_response',
      });
    },
  );

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

  it('keeps Retry-After seconds on 429 and ignores garbage values', async () => {
    const withHeader = setup(() => jsonResponse({}, 429, { 'retry-after': '42' }));
    expect(await withHeader.provider.moderate(VISITOR_TEXT)).toEqual({
      kind: 'transient',
      code: 'rate_limited',
      retryAfterSeconds: 42,
    });
    const garbage = setup(() => jsonResponse({}, 429, { 'retry-after': 'soon' }));
    expect(await garbage.provider.moderate(VISITOR_TEXT)).toEqual({
      kind: 'transient',
      code: 'rate_limited',
    });
  });

  it('maps a network failure to network without rejecting', async () => {
    const { provider } = setup(() => Promise.reject(new TypeError('fetch failed')));
    expect(await provider.moderate(VISITOR_TEXT)).toEqual({ kind: 'transient', code: 'network' });
  });

  it('maps a hung request to timeout once the timeout elapses', async () => {
    vi.useFakeTimers();
    const { provider } = setup(hangUntilAborted);
    const pending = provider.moderate(VISITOR_TEXT);
    await vi.advanceTimersByTimeAsync(4999);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
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
      provider: 'openai-moderation',
      outcome: 'auth',
      httpStatus: 401,
    });
  });
});

describe('FakeModerationProvider', () => {
  const fake = new FakeModerationProvider();

  it('flags [flag], fails [fail], and is clean otherwise', async () => {
    expect(await fake.moderate('hello [flag]')).toMatchObject({ kind: 'ok', flagged: true });
    expect(await fake.moderate('hello [fail]')).toEqual({
      kind: 'transient',
      code: 'provider_error',
    });
    expect(await fake.moderate('hello')).toMatchObject({ kind: 'ok', flagged: false });
  });

  it('delays [slow] by 6 s', async () => {
    vi.useFakeTimers();
    const pending = fake.moderate('hello [slow]');
    await vi.advanceTimersByTimeAsync(5999);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({ kind: 'ok', flagged: false });
  });
});
