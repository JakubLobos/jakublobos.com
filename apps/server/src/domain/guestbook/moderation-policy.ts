import type { ModerationScores } from './moderation.port.ts';

export type ModerationDecision =
  | { readonly decision: 'approve' }
  | { readonly decision: 'reject'; readonly categories: readonly string[] };

/**
 * Reject when the provider flagged the text or any category score reaches the threshold
 * (equal counts as reject). The categories returned are the offending ones, sorted, for logs.
 */
export function decideModeration(result: ModerationScores, threshold: number): ModerationDecision {
  const offending = new Set<string>();
  for (const [category, score] of Object.entries(result.scores)) {
    if (score >= threshold) offending.add(category);
  }
  for (const [category, hit] of Object.entries(result.categories)) {
    if (hit) offending.add(category);
  }
  if (!result.flagged && offending.size === 0) return { decision: 'approve' };
  return { decision: 'reject', categories: [...offending].sort() };
}
