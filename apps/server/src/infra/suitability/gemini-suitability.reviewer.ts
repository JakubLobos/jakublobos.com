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
import { GEMINI_BASE_URL } from '../moderation/gemini-moderation.provider.ts';
import { buildUserMessage, DEVELOPER_INSTRUCTIONS, PROMPT_VERSION } from './prompt.ts';

// Thinking tokens may count against this cap; the verdict itself is about 20 tokens.
const MAX_OUTPUT_TOKENS = 256;

const verdictSchema = z.strictObject({
  verdict: z.enum(SUITABILITY_VERDICTS),
  reason: z.enum(SUITABILITY_REASONS),
});

// Gemini takes an OpenAPI-subset schema (typed string enums), not the raw JSON Schema used by OpenAI.
const RESPONSE_SCHEMA = {
  type: 'object',
  required: ['verdict', 'reason'],
  properties: {
    verdict: { type: 'string', enum: SUITABILITY_VERDICTS },
    reason: { type: 'string', enum: SUITABILITY_REASONS },
  },
} as const;

const SAFETY_CATEGORIES = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
] as const;

const responseSchema = z.object({
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({ parts: z.array(z.object({ text: z.string().optional() })).optional() })
          .optional(),
      }),
    )
    .optional(),
});

// A safety stop means Google judged the text unacceptable: same handling as an OpenAI refusal.
const SAFETY_FINISH_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII']);

export function buildRequestBody(text: string, locale: Locale | null): object {
  return {
    systemInstruction: { parts: [{ text: DEVELOPER_INSTRUCTIONS }] },
    contents: [{ role: 'user', parts: [{ text: buildUserMessage(text, locale) }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
    safetySettings: SAFETY_CATEGORIES.map((category) => ({ category, threshold: 'BLOCK_NONE' })),
  };
}

const INVALID: SuitabilityOutcome = { kind: 'transient', code: 'invalid_response' };
const BLOCKED: SuitabilityOutcome = { kind: 'ok', verdict: 'reject', reason: 'other' };

/** Map a 2xx generateContent body to an outcome. Anything unexpected is transient, never an approval. */
export function parseGenerateContentBody(json: unknown): SuitabilityOutcome {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) return INVALID;
  if (parsed.data.promptFeedback?.blockReason !== undefined) return BLOCKED;

  const candidate = parsed.data.candidates?.[0];
  if (candidate === undefined) return INVALID;
  const { finishReason } = candidate;
  if (finishReason !== undefined && SAFETY_FINISH_REASONS.has(finishReason)) return BLOCKED;
  if (finishReason === 'MAX_TOKENS') return { kind: 'transient', code: 'incomplete' };
  if (finishReason !== undefined && finishReason !== 'STOP') return INVALID;

  const text = candidate.content?.parts?.find((part) => part.text !== undefined)?.text;
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

export interface GeminiSuitabilityOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly fetch: FetchFn;
  readonly clock: Clock;
  readonly logger: Logger;
}

export class GeminiSuitabilityReviewer implements SuitabilityReviewer {
  private readonly options: GeminiSuitabilityOptions;

  constructor(options: GeminiSuitabilityOptions) {
    this.options = options;
  }

  async review(text: string, locale: Locale | null): Promise<SuitabilityOutcome> {
    const { apiKey, model, timeoutMs, clock, logger } = this.options;
    const startedAt = clock.now();
    const result = await postJson(this.options.fetch, {
      url: `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`,
      apiKey,
      keyHeader: 'x-goog-api-key',
      body: buildRequestBody(text, locale),
      timeoutMs,
    });
    const outcome = result.ok ? parseGenerateContentBody(result.json) : toTransient(result.failure);

    // Verdict, reason, status, latency, model and prompt version only: never the text or the key.
    const entry = {
      provider: 'gemini-suitability',
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
