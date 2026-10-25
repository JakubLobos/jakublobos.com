/** Why a provider call produced no usable answer. Every one of these is transient (retried later). */
export type ProviderFailureCode =
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'provider_error'
  | 'auth'
  | 'bad_request'
  | 'invalid_response';

export interface ModerationScores {
  readonly flagged: boolean;
  /** Category name to the provider's boolean verdict. */
  readonly categories: Readonly<Record<string, boolean>>;
  /** Category name to a score in [0, 1]. */
  readonly scores: Readonly<Record<string, number>>;
}

export type ModerationOutcome =
  | ({ readonly kind: 'ok' } & ModerationScores)
  | {
      readonly kind: 'transient';
      readonly code: ProviderFailureCode;
      readonly retryAfterSeconds?: number;
    };

export interface ModerationProvider {
  /** Never rejects: every failure is a `transient` outcome. */
  moderate(text: string): Promise<ModerationOutcome>;
}
