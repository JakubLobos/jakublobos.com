import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../config.ts';
import { FakeClock } from '../../domain/shared/clock.ts';
import { FakeModerationProvider } from '../moderation/fake-moderation.provider.ts';
import { GeminiModerationProvider } from '../moderation/gemini-moderation.provider.ts';
import { OpenAiModerationProvider } from '../moderation/openai-moderation.provider.ts';
import { FakeSuitabilityReviewer } from '../suitability/fake-suitability.reviewer.ts';
import { GeminiSuitabilityReviewer } from '../suitability/gemini-suitability.reviewer.ts';
import { OpenAiSuitabilityReviewer } from '../suitability/openai-suitability.reviewer.ts';
import { createReviewProviders } from './index.ts';
import { captureLogger, createFetchStub, jsonResponse } from './test-kit.ts';

const stub = createFetchStub(() => jsonResponse({}));
const deps = { fetch: stub.fetch, clock: new FakeClock(), logger: captureLogger().logger };

describe('createReviewProviders', () => {
  it('returns fakes when configured (the default)', () => {
    const providers = createReviewProviders(loadConfig({}), deps);
    expect(providers.moderation).toBeInstanceOf(FakeModerationProvider);
    expect(providers.suitability).toBeInstanceOf(FakeSuitabilityReviewer);
  });

  it('returns the Gemini providers when configured', () => {
    const providers = createReviewProviders(
      loadConfig({
        MODERATION_PROVIDER: 'gemini',
        SUITABILITY_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'AIza-test',
      }),
      deps,
    );
    expect(providers.moderation).toBeInstanceOf(GeminiModerationProvider);
    expect(providers.suitability).toBeInstanceOf(GeminiSuitabilityReviewer);
  });

  it('returns the OpenAI providers only when configured, and picks each independently', () => {
    const both = createReviewProviders(
      loadConfig({
        MODERATION_PROVIDER: 'openai',
        SUITABILITY_PROVIDER: 'openai',
        OPENAI_API_KEY: 'sk-test',
      }),
      deps,
    );
    expect(both.moderation).toBeInstanceOf(OpenAiModerationProvider);
    expect(both.suitability).toBeInstanceOf(OpenAiSuitabilityReviewer);

    const mixed = createReviewProviders(
      loadConfig({ MODERATION_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' }),
      deps,
    );
    expect(mixed.moderation).toBeInstanceOf(OpenAiModerationProvider);
    expect(mixed.suitability).toBeInstanceOf(FakeSuitabilityReviewer);
  });

  it('refuses fakes in production and a real provider without a key', () => {
    const base = loadConfig({});
    expect(() => createReviewProviders({ ...base, isProduction: true }, deps)).toThrow(
      /not allowed in production/,
    );
    const noKey = { ...base, moderation: { ...base.moderation, provider: 'openai' as const } };
    expect(() => createReviewProviders(noKey, deps)).toThrow(/OPENAI_API_KEY/);
  });
});
