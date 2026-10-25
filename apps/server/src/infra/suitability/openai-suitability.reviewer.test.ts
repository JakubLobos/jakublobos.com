import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../domain/shared/clock.ts';
import {
  captureLogger,
  createFetchStub,
  fixtureJson,
  fixtureText,
  hangUntilAborted,
  jsonResponse,
  type FetchHandler,
} from '../review/test-kit.ts';
import { FakeSuitabilityReviewer } from './fake-suitability.reviewer.ts';
import { OpenAiSuitabilityReviewer } from './openai-suitability.reviewer.ts';
import { DEVELOPER_INSTRUCTIONS, PROMPT_VERSION } from './prompt.ts';

const SECRET_KEY = 'sk-test-secret-key';
const VISITOR_TEXT = 'private visitor words';

function setup(handler: FetchHandler) {
  const stub = createFetchStub(handler);
  const logs = captureLogger();
  const reviewer = new OpenAiSuitabilityReviewer({
    apiKey: SECRET_KEY,
    model: 'gpt-5-nano',
    timeoutMs: 10_000,
    fetch: stub.fetch,
    clock: new FakeClock(),
    logger: logs.logger,
  });
  return { reviewer, calls: stub.calls, logs };
}

const respondWith = (name: string): FetchHandler => {
  return () => jsonResponse(fixtureJson(`openai/responses/${name}.json`));
};

afterEach(() => {
  vi.useRealTimers();
});

describe('OpenAiSuitabilityReviewer outcome mapping', () => {
  it.each([
    ['approve', { kind: 'ok', verdict: 'approve', reason: 'ok' }],
    ['reject', { kind: 'ok', verdict: 'reject', reason: 'spam_or_ads' }],
    ['refusal', { kind: 'ok', verdict: 'reject', reason: 'other' }],
    ['incomplete', { kind: 'transient', code: 'incomplete' }],
    ['schema-invalid', { kind: 'transient', code: 'invalid_response' }],
    ['non-json-text', { kind: 'transient', code: 'invalid_response' }],
  ])('maps the %s fixture', async (name, expected) => {
    const { reviewer } = setup(respondWith(name));
    expect(await reviewer.review(VISITOR_TEXT, 'en')).toEqual(expected);
  });

  it('treats an approve verdict with a rejection reason as a reject', async () => {
    const body = {
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: '{"verdict":"approve","reason":"spam_or_ads"}' }],
        },
      ],
    };
    const { reviewer } = setup(() => jsonResponse(body));
    expect(await reviewer.review(VISITOR_TEXT, null)).toEqual({
      kind: 'ok',
      verdict: 'reject',
      reason: 'spam_or_ads',
    });
  });

  it.each([
    ['no message item', { status: 'completed', output: [{ type: 'reasoning' }] }],
    ['no output array', { status: 'completed' }],
    ['failed status', { status: 'failed', output: [] }],
  ])('treats %s as invalid_response', async (_label, body) => {
    const { reviewer } = setup(() => jsonResponse(body));
    expect(await reviewer.review(VISITOR_TEXT, 'en')).toEqual({
      kind: 'transient',
      code: 'invalid_response',
    });
  });

  it.each([
    [400, 'bad_request'],
    [401, 'auth'],
    [429, 'rate_limited'],
    [500, 'provider_error'],
  ])('maps HTTP %i to %s, keeping Retry-After', async (status, code) => {
    const { reviewer } = setup(() => jsonResponse({}, status, { 'retry-after': '7' }));
    const outcome = await reviewer.review(VISITOR_TEXT, 'en');
    expect(outcome).toMatchObject({ kind: 'transient', code });
    expect('retryAfterSeconds' in outcome).toBe(status === 429);
  });

  it('maps a network failure and a timeout without rejecting', async () => {
    const network = setup(() => Promise.reject(new TypeError('fetch failed')));
    expect(await network.reviewer.review(VISITOR_TEXT, 'en')).toEqual({
      kind: 'transient',
      code: 'network',
    });

    vi.useFakeTimers();
    const hung = setup(hangUntilAborted);
    const pending = hung.reviewer.review(VISITOR_TEXT, 'en');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await pending).toEqual({ kind: 'transient', code: 'timeout' });
  });
});

describe('OpenAiSuitabilityReviewer request', () => {
  it('sends a stateless, strict json_schema request with the text only in the user message', async () => {
    const { reviewer, calls } = setup(respondWith('approve'));
    await reviewer.review(VISITOR_TEXT, 'pl');
    expect(calls[0]?.url).toBe('https://api.openai.com/v1/responses');
    expect(calls[0]?.headers.authorization).toBe(`Bearer ${SECRET_KEY}`);
    expect(calls[0]?.body).toMatchSnapshot();
  });

  it('keeps every injection attempt inside one delimited, escaped user message', async () => {
    const attempts = fixtureText('guestbook/injection-attempts.txt').trim().split('\n');
    for (const attempt of attempts) {
      const { reviewer, calls } = setup(respondWith('approve'));
      await reviewer.review(attempt, 'en');
      const body = calls[0]?.body as { input: { role: string; content: string }[] };
      const [developer, user, ...rest] = body.input;
      expect(rest).toEqual([]);
      expect(developer).toEqual({ role: 'developer', content: DEVELOPER_INSTRUCTIONS });
      expect(user?.role).toBe('user');
      // Only the two real tags survive: any `<` or `>` typed by the visitor is escaped.
      expect(user?.content.match(/[<>]/g)).toHaveLength(4);
      expect(user?.content.startsWith('Page language: en\n<visitor_note>\n')).toBe(true);
      expect(user?.content.endsWith('\n</visitor_note>')).toBe(true);
    }
  });

  it('stays within the prompt budget and carries a version', () => {
    // Roughly 4 characters per token; the brief asks for under about 350 tokens.
    expect(DEVELOPER_INSTRUCTIONS.length / 4).toBeLessThan(350);
    expect(PROMPT_VERSION).toMatch(/^guestbook-suitability-v\d+$/);
  });
});

describe('OpenAiSuitabilityReviewer logging', () => {
  it('logs verdict, reason, model and prompt version, never the text or the key', async () => {
    const { reviewer, logs } = setup(respondWith('reject'));
    await reviewer.review(VISITOR_TEXT, 'en');
    const output = logs.output();
    expect(output).not.toContain(VISITOR_TEXT);
    expect(output).not.toContain(SECRET_KEY);
    expect(JSON.parse(output.trim())).toMatchObject({
      provider: 'openai-suitability',
      outcome: 'ok',
      verdict: 'reject',
      reason: 'spam_or_ads',
      model: 'gpt-5-nano',
      promptVersion: PROMPT_VERSION,
    });
  });
});

describe('FakeSuitabilityReviewer', () => {
  const fake = new FakeSuitabilityReviewer();

  it('rejects [unsuitable], fails [sfail], and approves otherwise', async () => {
    expect(await fake.review('hi [unsuitable]')).toEqual({
      kind: 'ok',
      verdict: 'reject',
      reason: 'off_topic_or_weird',
    });
    expect(await fake.review('hi [sfail]')).toEqual({ kind: 'transient', code: 'provider_error' });
    expect(await fake.review('hi')).toEqual({ kind: 'ok', verdict: 'approve', reason: 'ok' });
  });
});
