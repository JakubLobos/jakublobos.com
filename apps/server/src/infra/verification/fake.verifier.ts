import type { HumanVerifier } from '../../domain/contact/human-verifier.port.ts';

/** Local development and e2e only; config refuses `HUMAN_VERIFIER=fake` in production. */
export function createFakeVerifier(): HumanVerifier {
  return {
    verify: (token) =>
      Promise.resolve(
        token === 'pass' ? { kind: 'verified' } : { kind: 'rejected', reason: 'fake-token' },
      ),
  };
}
