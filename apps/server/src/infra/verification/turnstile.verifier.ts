import { z } from 'zod';
import type {
  HumanVerifier,
  VerificationResult,
} from '../../domain/contact/human-verifier.port.ts';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DEFAULT_TIMEOUT_MS = 5_000;

/** Errors that mean our setup or Cloudflare is at fault, not the visitor's token. */
const PROVIDER_FAULT_CODES: ReadonlySet<string> = new Set([
  'missing-input-secret',
  'invalid-input-secret',
  'internal-error',
]);

const SiteverifyResponseSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
  'error-codes': z.array(z.string()).optional(),
});

export interface TurnstileVerifierOptions {
  readonly secret: string;
  readonly allowedHostnames: readonly string[];
  readonly fetch: typeof fetch;
  /** A fresh value per call; Cloudflare uses it to de-duplicate retries. */
  readonly nextIdempotencyKey: () => string;
  readonly timeoutMs?: number;
}

const unavailable: VerificationResult = { kind: 'unavailable' };

/** Fail-closed: anything other than a clean, matching `success` response is not verified. */
export function createTurnstileVerifier(options: TurnstileVerifierOptions): HumanVerifier {
  const allowed = new Set(options.allowedHostnames.map((hostname) => hostname.toLowerCase()));

  return {
    async verify(token, { remoteIp, expectedAction }) {
      let body: unknown;
      try {
        const response = await options.fetch(SITEVERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: options.secret,
            response: token,
            remoteip: remoteIp,
            idempotency_key: options.nextIdempotencyKey(),
          }),
          signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        });
        if (!response.ok) return unavailable;
        body = await response.json();
      } catch {
        // Network error, timeout, or a body that is not JSON.
        return unavailable;
      }

      const parsed = SiteverifyResponseSchema.safeParse(body);
      if (!parsed.success) return unavailable;
      const result = parsed.data;

      if (!result.success) {
        const codes = result['error-codes'] ?? [];
        if (codes.some((code) => PROVIDER_FAULT_CODES.has(code))) return unavailable;
        return { kind: 'rejected', reason: codes.join(',') || 'unsuccessful' };
      }
      if (result.hostname === undefined || !allowed.has(result.hostname.toLowerCase())) {
        return { kind: 'rejected', reason: 'hostname-mismatch' };
      }
      if (result.action !== expectedAction) return { kind: 'rejected', reason: 'action-mismatch' };
      return { kind: 'verified' };
    },
  };
}
