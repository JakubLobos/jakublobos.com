export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
/** One English CV serves both site languages (owner decision, ADR-0018). */
export const RESUME_DOWNLOAD_NAME = 'Jakub_Lobos_CV.pdf';

const PDF_SIGNATURE = '%PDF-';

export function isAcceptableResume(bytes: Uint8Array): boolean {
  if (bytes.byteLength > RESUME_MAX_BYTES) return false;
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, PDF_SIGNATURE.length));
  return head === PDF_SIGNATURE;
}
