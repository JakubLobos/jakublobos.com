import { requestFile, type ApiResult } from './client.ts';

export const RESUME_MIME = 'application/pdf';

// Every failure (403 verification, 429, 503, network) is mapped by the shared client; the file
// name is fixed by the page, so the response's own headers are never trusted for it.
export function fetchResume(turnstileToken: string): Promise<ApiResult<Blob>> {
  return requestFile('/api/resume', { method: 'POST', body: { turnstileToken } }, RESUME_MIME);
}
