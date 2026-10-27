export interface VerifyContext {
  readonly remoteIp: string;
  /** The Turnstile `action` the widget was rendered with; a token minted for another action is rejected. */
  readonly expectedAction: string;
}

export type VerificationResult =
  | { readonly kind: 'verified' }
  | { readonly kind: 'rejected'; readonly reason: string }
  | { readonly kind: 'unavailable' };

/** Decides whether a token proves a human visitor. Implementations never throw: failures map to `unavailable`. */
export interface HumanVerifier {
  verify(token: string, context: VerifyContext): Promise<VerificationResult>;
}
