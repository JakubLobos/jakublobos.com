export interface InsertAttempt {
  /** The control's `maxLength`; -1 when it has none. */
  maxLength: number;
  valueLength: number;
  /** Characters the insert would replace. */
  selectionLength: number;
  insertLength: number;
}

/** True when the insert would not fit, which is when the browser blocks or truncates it. */
export function wouldOverflow({
  maxLength,
  valueLength,
  selectionLength,
  insertLength,
}: InsertAttempt): boolean {
  return maxLength >= 0 && insertLength > maxLength - (valueLength - selectionLength);
}
