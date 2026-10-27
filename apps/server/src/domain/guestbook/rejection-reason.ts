import type { SubmissionReason } from '@portfolio/contracts';
import type { ReviewLayer } from './review-pipeline.ts';

/**
 * Maps an internal rejection to the one of four deliberately vague reasons a visitor may see
 * (ADR-0017). The point is that the answer teaches nothing about which filter fired, so the
 * status endpoint cannot be used to probe the rules or the classifier.
 */
export function generalReason(rejection: {
  readonly layer: ReviewLayer;
  readonly reason: string;
}): SubmissionReason {
  switch (rejection.layer) {
    case 'moderation':
      return 'inappropriate';
    case 'rules':
      // Quality heuristics and meme tokens say "not serious", profanity and spam say "not nice".
      return rejection.reason === 'blocked_term' ? 'inappropriate' : 'off_topic';
    case 'suitability':
      switch (rejection.reason) {
        case 'impersonation':
          return 'impersonation';
        case 'personal_data':
          return 'personal_data';
        case 'low_effort_or_meme':
        case 'off_topic_or_weird':
        case 'gibberish':
        case 'other':
          return 'off_topic';
        default:
          // offensive, sexual, political, negative, spam, self-promotion, and anything new.
          return 'inappropriate';
      }
  }
}
