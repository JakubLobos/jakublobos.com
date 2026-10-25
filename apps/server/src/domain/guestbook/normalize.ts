/** SHA-256 behind a port so `domain/` stays free of `node:crypto`. */
export interface Hasher {
  /** Lowercase hex digest of the UTF-8 encoding of `text`. */
  sha256Hex(text: string): string;
}

/**
 * Comparison key for "same message": compatibility-normalized (full-width and styled letters
 * fold to plain ones), lowercase, single-spaced, without trailing punctuation, so
 * "Great site!" and "great   site" count as one.
 */
export function dedupeKey(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/gu, ' ')
    .replace(/[\s\p{P}]+$/u, '')
    .trim();
}

/** Stored in the UNIQUE `content_hash` column and used as the recent-rejection key. */
export function contentHash(text: string, hasher: Hasher): string {
  return hasher.sha256Hex(dedupeKey(text));
}
