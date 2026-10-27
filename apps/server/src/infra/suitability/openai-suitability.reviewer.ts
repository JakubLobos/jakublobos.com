import type { Locale } from '@portfolio/contracts';
import type { Logger } from 'pino';
import { z } from 'zod';
import type {
  SuitabilityOutcome,
  SuitabilityReviewer,
} from '../../domain/guestbook/suitability.port.ts';
import {
  SUITABILITY_REASONS,
  SUITABILITY_VERDICTS,
} from '../../domain/guestbook/suitability.port.ts';
import type { Clock } from '../../domain/shared/clock.ts';
import { postJson, toTransient, type FetchFn } from '../review/http.ts';
import {
  buildUserMessage,
  DEVELOPER_INSTRUCTIONS,
  PROMPT_VERSION,
  VERDICT_JSON_SCHEMA,
} from './prompt.ts';

export const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

// Reasoning tokens count against this cap; the verdict itself is about 20 tokens.
const MAX_OUTPUT_TOKENS = 256;

const verdictSchema = z.strictObject({
  verdict: z.enum(SUITABILITY_VERDICTS),
  reason: z.enum(SUITABILITY_REASONS),
});

// Only the parts we read are described; everything else is ignored, not trusted.
const contentPartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});
const responseSchema = z.object({
  status: z.string().optional(),
  output: z.array(
    z.object({
      type: z.string(),
      content: z.array(contentPartSchema).optional(),
    }),
  ),
});

export function buildRequestBody(model: string, text: string, locale: Locale | null): object {
  return {
    model,
    store: false,
    reasoning: { effort: 'minimal' },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [
      { role: 'developer', content: DEVELOPER_INSTRUCTIONS },
      { role: 'user', content: buildUserMessage(text, locale) },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'guestbook_verdict',
        strict: true,
        schema: VERDICT_JSON_SCHEMA,
      },
    },
  };
}

const INVALID: SuitabilityOutcome = { kind: 'transient', code: 'invalid_response' };

/** Map a 2xx Responses body to an outcome. Anything unexpected is transient, never an approval. */
export function parseResponsesBody(json: unknown): SuitabilityOutcome {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) return INVALID;
  const { status, output } = parsed.data;
  if (status === 'incomplete') return { kind: 'transient', code: 'incomplete' };
  if (status !== undefined && status !== 'completed') return INVALID;

  const parts = output.flatMap((item) => item.content ?? []);
  // A refusal wins over any text beside it: the model declined, so the note is not published.
  if (output.some((item) => item.type === 'refusal') || parts.some((p) => p.type === 'refusal')) {
    return { kind: 'ok', verdict: 'reject', reason: 'other' };
  }

  const message = output.find((item) => item.type === 'message');
  const text = message?.content?.find((part) => part.type === 'output_text')?.text;
  if (text === undefined) return INVALID;

  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch {
    return INVALID;
  }
  const verdict = verdictSchema.safeParse(decoded);
  if (!verdict.success) return INVALID;
  // "approve" with a rejection reason contradicts itself; fail closed.
  if (verdict.data.verdict === 'approve' && verdict.data.reason !== 'ok') {
    return { kind: 'ok', verdict: 'reject', reason: verdict.data.reason };
  }
  return { kind: 'ok', ...verdict.data };
}

export interface OpenAiSuitabilityOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly fetch: FetchFn;
  readonly clock: Clock;
  readonly logger: Logger;
}

export class OpenAiSuitabilityReviewer implements SuitabilityReviewer {
  private readonly options: OpenAiSuitabilityOptions;

  constructor(options: OpenAiSuitabilityOptions) {
    this.options = options;
  }

  async review(text: string, locale: Locale | null): Promise<SuitabilityOutcome> {
    const { apiKey, model, timeoutMs, clock, logger } = this.options;
    const startedAt = clock.now();
    const result = await postJson(this.options.fetch, {
      url: OPENAI_RESPONSES_URL,
      apiKey,
      body: buildRequestBody(model, text, locale),
      timeoutMs,
    });
    const outcome = result.ok ? parseResponsesBody(result.json) : toTransient(result.failure);

    // Verdict, reason, status, latency, model and prompt version only: never the text or the key.
    const entry = {
      provider: 'openai-suitability',
      model,
      promptVersion: PROMPT_VERSION,
      httpStatus: result.ok ? result.httpStatus : result.failure.httpStatus,
      latencyMs: clock.now() - startedAt,
      ...(outcome.kind === 'ok'
        ? { outcome: 'ok', verdict: outcome.verdict, reason: outcome.reason }
        : { outcome: outcome.code }),
    };
    if (!result.ok && (result.failure.code === 'auth' || result.failure.code === 'bad_request')) {
      logger.error(entry, 'suitability request rejected by the provider');
    } else {
      logger.info(entry, 'suitability reviewed');
    }
    return outcome;
  }
}
