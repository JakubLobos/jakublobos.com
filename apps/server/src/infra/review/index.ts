import type { Logger } from 'pino';
import type { Config } from '../../config.ts';
import type { ModerationProvider } from '../../domain/guestbook/moderation.port.ts';
import type { SuitabilityReviewer } from '../../domain/guestbook/suitability.port.ts';
import type { Clock } from '../../domain/shared/clock.ts';
import { FakeModerationProvider } from '../moderation/fake-moderation.provider.ts';
import { GeminiModerationProvider } from '../moderation/gemini-moderation.provider.ts';
import { OpenAiModerationProvider } from '../moderation/openai-moderation.provider.ts';
import { FakeSuitabilityReviewer } from '../suitability/fake-suitability.reviewer.ts';
import { GeminiSuitabilityReviewer } from '../suitability/gemini-suitability.reviewer.ts';
import { OpenAiSuitabilityReviewer } from '../suitability/openai-suitability.reviewer.ts';
import type { FetchFn } from './http.ts';

export interface ReviewProviders {
  readonly moderation: ModerationProvider;
  readonly suitability: SuitabilityReviewer;
}

export interface ReviewProviderDeps {
  readonly fetch: FetchFn;
  readonly clock: Clock;
  readonly logger: Logger;
}

type ReviewConfig = Pick<
  Config,
  'isProduction' | 'openaiApiKey' | 'geminiApiKey' | 'moderation' | 'suitability'
>;

/** Picks real or fake providers from config. Config validation already refuses fakes in production. */
export function createReviewProviders(
  config: ReviewConfig,
  deps: ReviewProviderDeps,
): ReviewProviders {
  const usesFake = config.moderation.provider === 'fake' || config.suitability.provider === 'fake';
  if (config.isProduction && usesFake) {
    throw new Error('Fake review providers are not allowed in production');
  }
  const { openaiApiKey } = config;
  const requireKey = (): string => {
    if (openaiApiKey === undefined) throw new Error('OPENAI_API_KEY is required');
    return openaiApiKey;
  };

  const requireGeminiKey = (): string => {
    if (config.geminiApiKey === undefined) throw new Error('GEMINI_API_KEY is required');
    return config.geminiApiKey;
  };

  const moderation: ModerationProvider =
    config.moderation.provider === 'fake'
      ? new FakeModerationProvider()
      : config.moderation.provider === 'gemini'
        ? new GeminiModerationProvider({
            apiKey: requireGeminiKey(),
            model: config.moderation.model,
            timeoutMs: config.moderation.timeoutMs,
            ...deps,
          })
        : new OpenAiModerationProvider({
            apiKey: requireKey(),
            model: config.moderation.model,
            timeoutMs: config.moderation.timeoutMs,
            ...deps,
          });

  const suitability: SuitabilityReviewer =
    config.suitability.provider === 'fake'
      ? new FakeSuitabilityReviewer()
      : config.suitability.provider === 'gemini'
        ? new GeminiSuitabilityReviewer({
            apiKey: requireGeminiKey(),
            model: config.suitability.model,
            timeoutMs: config.suitability.timeoutMs,
            ...deps,
          })
        : new OpenAiSuitabilityReviewer({
            apiKey: requireKey(),
            model: config.suitability.model,
            timeoutMs: config.suitability.timeoutMs,
            ...deps,
          });

  return { moderation, suitability };
}
