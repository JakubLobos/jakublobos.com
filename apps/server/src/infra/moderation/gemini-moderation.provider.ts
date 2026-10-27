import type { Logger } from 'pino';
import { z } from 'zod';
import type { Clock } from '../../domain/shared/clock.ts';
import type {
  ModerationOutcome,
  ModerationProvider,
} from '../../domain/guestbook/moderation.port.ts';
import { postJson, toTransient, type FetchFn } from '../review/http.ts';

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Gemini reports a probability bucket, not a score. The buckets map to scores so the
 * existing 0.2 threshold rejects LOW and above: the guestbook is a professional page.
 */
export const PROBABILITY_SCORES: Readonly<Record<string, number>> = {
  NEGLIGIBLE: 0,
  LOW: 0.25,
  MEDIUM: 0.6,
  HIGH: 0.9,
};

// BLOCK_NONE returns ratings instead of withholding the prompt (the block reason is still honoured).
const SAFETY_CATEGORIES = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
] as const;

const ratingSchema = z.object({ category: z.string(), probability: z.string() });
const responseSchema = z.object({
  promptFeedback: z
    .object({
      blockReason: z.string().optional(),
      safetyRatings: z.array(ratingSchema).optional(),
    })
    .optional(),
});

export interface GeminiModerationOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly fetch: FetchFn;
  readonly clock: Clock;
  readonly logger: Logger;
}

/** `HARM_CATEGORY_HATE_SPEECH` becomes `hate_speech`, matching the lower-case category style. */
const categoryName = (raw: string): string => raw.replace(/^HARM_CATEGORY_/, '').toLowerCase();

/** Map a 2xx body to an outcome. Missing ratings without a block reason are unusable, so transient. */
export function parseModerationBody(json: unknown): ModerationOutcome {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) return { kind: 'transient', code: 'invalid_response' };
  const feedback = parsed.data.promptFeedback;
  const categories: Record<string, boolean> = {};
  const scores: Record<string, number> = {};
  for (const rating of feedback?.safetyRatings ?? []) {
    const score = PROBABILITY_SCORES[rating.probability];
    // An unknown bucket (for example UNSPECIFIED) says nothing, so it must not read as clean.
    if (score === undefined) return { kind: 'transient', code: 'invalid_response' };
    const name = categoryName(rating.category);
    scores[name] = Math.max(scores[name] ?? 0, score);
    categories[name] = scores[name] >= 0.5;
  }
  const blocked = feedback?.blockReason !== undefined;
  if (blocked) {
    // A prompt block is Google's own verdict that the text is unacceptable.
    categories.prompt_blocked = true;
    scores.prompt_blocked = 1;
  }
  if (Object.keys(scores).length === 0) return { kind: 'transient', code: 'invalid_response' };
  return { kind: 'ok', flagged: blocked, categories, scores };
}

export class GeminiModerationProvider implements ModerationProvider {
  private readonly options: GeminiModerationOptions;

  constructor(options: GeminiModerationOptions) {
    this.options = options;
  }

  async moderate(text: string): Promise<ModerationOutcome> {
    const { apiKey, model, timeoutMs, clock, logger } = this.options;
    const startedAt = clock.now();
    // Only the prompt ratings are used; one output token keeps the generation itself negligible.
    const result = await postJson(this.options.fetch, {
      url: `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`,
      apiKey,
      keyHeader: 'x-goog-api-key',
      body: {
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 1 },
        safetySettings: SAFETY_CATEGORIES.map((category) => ({
          category,
          threshold: 'BLOCK_NONE',
        })),
      },
      timeoutMs,
    });

    const outcome = result.ok ? parseModerationBody(result.json) : toTransient(result.failure);
    const httpStatus = result.ok ? result.httpStatus : result.failure.httpStatus;

    // Only the outcome class, HTTP status, latency and model: never the text or the key.
    const entry = {
      provider: 'gemini-moderation',
      model,
      outcome: outcome.kind === 'ok' ? 'ok' : outcome.code,
      httpStatus,
      latencyMs: clock.now() - startedAt,
    };
    if (
      outcome.kind === 'transient' &&
      (outcome.code === 'auth' || outcome.code === 'bad_request')
    ) {
      logger.error(entry, 'moderation request rejected by the provider');
    } else {
      logger.info(entry, 'moderation reviewed');
    }
    return outcome;
  }
}
