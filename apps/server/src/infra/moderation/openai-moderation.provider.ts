import type { Logger } from 'pino';
import { z } from 'zod';
import type { Clock } from '../../domain/shared/clock.ts';
import type {
  ModerationOutcome,
  ModerationProvider,
} from '../../domain/guestbook/moderation.port.ts';
import { postJson, toTransient, type FetchFn } from '../review/http.ts';

export const OPENAI_MODERATIONS_URL = 'https://api.openai.com/v1/moderations';

// Extra categories are allowed (the model list grows); an empty score map is not usable.
const moderationResponseSchema = z.object({
  results: z
    .array(
      z.object({
        flagged: z.boolean(),
        categories: z.record(z.string(), z.boolean()),
        category_scores: z
          .record(z.string(), z.number().min(0).max(1))
          .refine((scores) => Object.keys(scores).length > 0),
      }),
    )
    .min(1),
});

export interface OpenAiModerationOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly fetch: FetchFn;
  readonly clock: Clock;
  readonly logger: Logger;
}

export class OpenAiModerationProvider implements ModerationProvider {
  private readonly options: OpenAiModerationOptions;

  constructor(options: OpenAiModerationOptions) {
    this.options = options;
  }

  async moderate(text: string): Promise<ModerationOutcome> {
    const { apiKey, model, timeoutMs, clock, logger } = this.options;
    const startedAt = clock.now();
    const result = await postJson(this.options.fetch, {
      url: OPENAI_MODERATIONS_URL,
      apiKey,
      body: { model, input: text },
      timeoutMs,
    });

    let outcome: ModerationOutcome;
    let httpStatus: number | undefined;
    if (!result.ok) {
      httpStatus = result.failure.httpStatus;
      outcome = toTransient(result.failure);
    } else {
      httpStatus = result.httpStatus;
      const parsed = moderationResponseSchema.safeParse(result.json);
      const first = parsed.success ? parsed.data.results[0] : undefined;
      outcome =
        first === undefined
          ? { kind: 'transient', code: 'invalid_response' }
          : {
              kind: 'ok',
              flagged: first.flagged,
              categories: first.categories,
              scores: first.category_scores,
            };
    }

    // Only the outcome class, HTTP status, latency and model: never the text or the key.
    const entry = {
      provider: 'openai-moderation',
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
