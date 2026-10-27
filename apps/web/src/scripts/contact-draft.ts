import type { ContactInput } from '@portfolio/contracts';
import {
  CONTACT_DRAFT_KEY,
  parseContactDraft,
  serializeContactDraft,
} from '../lib/contact-draft.ts';

// Every access is guarded: blocked or full storage must leave the form working as if there were none.

/** The saved draft, or null. A draft that fails validation is removed. */
export function loadDraft(): ContactInput | null {
  try {
    const raw = sessionStorage.getItem(CONTACT_DRAFT_KEY);
    const draft = parseContactDraft(raw);
    if (raw !== null && !draft) sessionStorage.removeItem(CONTACT_DRAFT_KEY);
    return draft;
  } catch {
    return null;
  }
}

/** Keeps the typed values for this tab; empty values remove the draft. */
export function saveDraft(values: ContactInput): void {
  try {
    const raw = serializeContactDraft(values);
    if (raw === null) sessionStorage.removeItem(CONTACT_DRAFT_KEY);
    else sessionStorage.setItem(CONTACT_DRAFT_KEY, raw);
  } catch {
    // Nothing to do: the draft is a convenience.
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(CONTACT_DRAFT_KEY);
  } catch {
    // See saveDraft.
  }
}
