import { checkGuestbookBody, type Locale } from '@portfolio/contracts';
import { findBlockedTerm } from './blocked-terms.ts';
import type { ModerationProvider } from './moderation.port.ts';
import { decideModeration } from './moderation-policy.ts';
import { checkQuality } from './quality-rules.ts';
import type { SuitabilityFailureCode, SuitabilityReviewer } from './suitability.port.ts';

export type ReviewLayer = 'rules' | 'moderation' | 'suitability';

export type ReviewDecision =
  | { readonly kind: 'approve' }
  /** `reason` is a rule name, moderation categories, or a suitability reason: never message text. */
  | { readonly kind: 'reject'; readonly layer: ReviewLayer; readonly reason: string }
  | {
      readonly kind: 'transient';
      readonly code: SuitabilityFailureCode;
      readonly retryAfterSeconds?: number;
    };

export interface ReviewPipelineDeps {
  readonly moderation: ModerationProvider;
  readonly suitability: SuitabilityReviewer;
  readonly moderationThreshold: number;
}

export interface ReviewPipeline {
  reviewMessage(input: {
    readonly body: string;
    readonly locale: Locale | null;
  }): Promise<ReviewDecision>;
}

function localRuleHit(body: string): string | null {
  const feedback = checkGuestbookBody(body).errors;
  if (feedback.length > 0) return feedback.join(',');
  const quality = checkQuality(body);
  if (!quality.ok) return quality.rule;
  return findBlockedTerm(body) === null ? null : 'blocked_term';
}

function transient(outcome: {
  readonly code: SuitabilityFailureCode;
  readonly retryAfterSeconds?: number | undefined;
}): ReviewDecision {
  return {
    kind: 'transient',
    code: outcome.code,
    ...(outcome.retryAfterSeconds === undefined
      ? {}
      : { retryAfterSeconds: outcome.retryAfterSeconds }),
  };
}

/** Pure orchestration over ports; its final `approve` is the only one in the backend (I-1). */
export function createReviewPipeline(deps: ReviewPipelineDeps): ReviewPipeline {
  return {
    async reviewMessage({ body, locale }) {
      // Submission already ran these; repeating them keeps I-1 true even for a row stored
      // before the rules last changed. They are free, so they go first.
      const rule = localRuleHit(body);
      if (rule !== null) return { kind: 'reject', layer: 'rules', reason: rule };

      const moderation = await deps.moderation.moderate(body);
      if (moderation.kind === 'transient') return transient(moderation);
      const decision = decideModeration(moderation, deps.moderationThreshold);
      if (decision.decision === 'reject') {
        return { kind: 'reject', layer: 'moderation', reason: decision.categories.join(',') };
      }

      // The paid call is only reached once moderation explicitly passed.
      const suitability = await deps.suitability.review(body, locale);
      if (suitability.kind === 'transient') return transient(suitability);
      if (suitability.verdict !== 'approve') {
        return { kind: 'reject', layer: 'suitability', reason: suitability.reason };
      }
      return { kind: 'approve' };
    },
  };
}
