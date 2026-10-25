import type {
  SuitabilityOutcome,
  SuitabilityReviewer,
} from '../../domain/guestbook/suitability.port.ts';

/** Dev/test reviewer driven by markers in the text. Never used in production (config refuses it). */
export class FakeSuitabilityReviewer implements SuitabilityReviewer {
  review(text: string): Promise<SuitabilityOutcome> {
    if (text.includes('[sfail]')) {
      return Promise.resolve({ kind: 'transient', code: 'provider_error' });
    }
    if (text.includes('[unsuitable]')) {
      return Promise.resolve({ kind: 'ok', verdict: 'reject', reason: 'off_topic_or_weird' });
    }
    return Promise.resolve({ kind: 'ok', verdict: 'approve', reason: 'ok' });
  }
}
