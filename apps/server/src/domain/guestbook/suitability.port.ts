import type { Locale } from '@portfolio/contracts';
import type { ProviderFailureCode } from './moderation.port.ts';

export const SUITABILITY_REASONS = [
  'ok',
  'gibberish',
  'spam_or_ads',
  'self_promotion',
  'offensive_or_rude',
  'sexual_or_suggestive',
  'political_or_religious',
  'personal_data',
  'impersonation',
  'negative_about_owner',
  'off_topic_or_weird',
  'other',
] as const;
export type SuitabilityReason = (typeof SUITABILITY_REASONS)[number];

export const SUITABILITY_VERDICTS = ['approve', 'reject'] as const;
export type SuitabilityVerdict = (typeof SUITABILITY_VERDICTS)[number];

export type SuitabilityFailureCode = ProviderFailureCode | 'incomplete';

export type SuitabilityOutcome =
  | {
      readonly kind: 'ok';
      readonly verdict: SuitabilityVerdict;
      readonly reason: SuitabilityReason;
    }
  | {
      readonly kind: 'transient';
      readonly code: SuitabilityFailureCode;
      readonly retryAfterSeconds?: number;
    };

export interface SuitabilityReviewer {
  /** Never rejects: every failure is a `transient` outcome. `locale` is the page language, if known. */
  review(text: string, locale: Locale | null): Promise<SuitabilityOutcome>;
}
