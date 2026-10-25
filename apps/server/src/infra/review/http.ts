import type { ProviderFailureCode } from '../../domain/guestbook/moderation.port.ts';

export type FetchFn = typeof globalThis.fetch;

export interface ProviderFailure {
  readonly code: ProviderFailureCode;
  readonly httpStatus?: number;
  readonly retryAfterSeconds?: number;
}

export type JsonPostResult =
  | { readonly ok: true; readonly json: unknown; readonly httpStatus: number }
  | { readonly ok: false; readonly failure: ProviderFailure };

export interface JsonPostRequest {
  readonly url: string;
  readonly apiKey: string;
  readonly body: unknown;
  readonly timeoutMs: number;
}

export interface TransientOutcome {
  readonly kind: 'transient';
  readonly code: ProviderFailureCode;
  readonly retryAfterSeconds?: number;
}

export function toTransient(failure: ProviderFailure): TransientOutcome {
  return {
    kind: 'transient',
    code: failure.code,
    ...(failure.retryAfterSeconds !== undefined && {
      retryAfterSeconds: failure.retryAfterSeconds,
    }),
  };
}

function parseRetryAfter(header: string | null): number | undefined {
  if (header === null || !/^\d{1,7}$/.test(header.trim())) return undefined;
  return Number(header.trim());
}

function statusFailure(response: Response): ProviderFailure {
  const { status } = response;
  if (status === 429) {
    const retryAfterSeconds = parseRetryAfter(response.headers.get('retry-after'));
    return {
      code: 'rate_limited',
      httpStatus: status,
      ...(retryAfterSeconds !== undefined && { retryAfterSeconds }),
    };
  }
  if (status >= 500) return { code: 'provider_error', httpStatus: status };
  if (status === 401 || status === 403) return { code: 'auth', httpStatus: status };
  return { code: 'bad_request', httpStatus: status };
}

/**
 * POST JSON with a Bearer key and map every failure to a `ProviderFailure`. Never throws.
 * The timeout covers reading the body too, and uses a plain timer so tests can fake it.
 */
export async function postJson(
  fetchFn: FetchFn,
  request: JsonPostRequest,
): Promise<JsonPostResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, request.timeoutMs);
  try {
    const response = await fetchFn(request.url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${request.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Release the connection: an unread body keeps it busy until garbage collection.
      await response.body?.cancel().catch(() => undefined);
      return { ok: false, failure: statusFailure(response) };
    }
    const raw = await response.text();
    try {
      return { ok: true, json: JSON.parse(raw) as unknown, httpStatus: response.status };
    } catch {
      return { ok: false, failure: { code: 'invalid_response', httpStatus: response.status } };
    }
  } catch {
    // Reading the error message is skipped on purpose: only the class of failure is needed.
    return { ok: false, failure: { code: controller.signal.aborted ? 'timeout' : 'network' } };
  } finally {
    clearTimeout(timer);
  }
}
