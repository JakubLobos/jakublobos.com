import {
  CONTACT_EMAIL_MAX,
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
  type ContactInput,
} from '@portfolio/contracts';

/** Bump when the stored shape changes; older drafts are then discarded rather than migrated. */
const VERSION = 1;

/** The sessionStorage key of the unsent contact-form draft. */
export const CONTACT_DRAFT_KEY = 'jl-contact-draft';

/** Serializes the raw typed values, or returns null when there is nothing worth keeping. */
export function serializeContactDraft({ name, email, message }: ContactInput): string | null {
  if (!name && !email && !message) return null;
  return JSON.stringify({ v: VERSION, name, email, message });
}

/** Storage is untrusted: accepts only the exact shape and clamps each field to its maxlength. */
export function parseContactDraft(raw: string | null): ContactInput | null {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { v, name, email, message } = data as Record<string, unknown>;
  if (
    v !== VERSION ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string'
  ) {
    return null;
  }
  return {
    name: name.slice(0, CONTACT_NAME_MAX),
    email: email.slice(0, CONTACT_EMAIL_MAX),
    message: message.slice(0, CONTACT_MESSAGE_MAX),
  };
}
