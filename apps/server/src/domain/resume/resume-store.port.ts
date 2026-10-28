export type ResumeReadResult =
  | { readonly kind: 'found'; readonly bytes: Uint8Array }
  | { readonly kind: 'missing' }
  /** A file exists but is not an acceptable PDF (wrong signature, or too large). */
  | { readonly kind: 'invalid' };

/** Where the owner's resume lives. The file is never part of the repository or the image (ADR-0018). */
export interface ResumeStore {
  /** Never throws. */
  read(): Promise<ResumeReadResult>;
}
