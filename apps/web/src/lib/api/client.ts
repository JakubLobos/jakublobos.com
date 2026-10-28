import { FIELD_ERROR_CODES, type FieldErrorCode } from '@portfolio/contracts';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'validation'; fields: Partial<Record<string, FieldErrorCode[]>> }
  | { ok: false; kind: 'rate_limited'; retryAfterSeconds: number | null }
  | { ok: false; kind: 'not_found' }
  | { ok: false; kind: 'unavailable' | 'network' | 'unexpected' };

/** Validates the envelope's `data` payload; hand-written so zod stays out of the bundle. */
export type Guard<T> = (value: unknown) => value is T;

export interface ApiRequestInit {
  method?: 'GET' | 'POST';
  /** Serialised as JSON. */
  body?: unknown;
  /** Overrides `REQUEST_TIMEOUT_MS`; an exceeded timeout is reported as `network`. */
  timeoutMs?: number;
}

export const REQUEST_TIMEOUT_MS = 10_000;

const UNAVAILABLE_STATUSES = new Set([502, 503, 504]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFieldErrorCode(value: unknown): value is FieldErrorCode {
  return FIELD_ERROR_CODES.some((code) => code === value);
}

function parseFields(body: unknown): Partial<Record<string, FieldErrorCode[]>> | null {
  if (!isRecord(body) || !isRecord(body.error) || !isRecord(body.error.fields)) return null;
  const fields: Partial<Record<string, FieldErrorCode[]>> = {};
  for (const [name, codes] of Object.entries(body.error.fields)) {
    if (Array.isArray(codes)) fields[name] = codes.filter(isFieldErrorCode);
  }
  return fields;
}

function parseRetryAfter(header: string | null): number | null {
  if (header === null || !/^\d+$/.test(header.trim())) return null;
  return Number(header);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch (error) {
    // Only a malformed body is "unexpected"; an abort mid-read must still surface as a timeout.
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

function apiBaseUrl(): string {
  const base: unknown = import.meta.env.PUBLIC_API_BASE_URL;
  return typeof base === 'string' ? base.replace(/\/+$/, '') : '';
}

type Failure = Extract<ApiResult<never>, { ok: false }>;

async function failureOf(response: Response): Promise<Failure> {
  if (response.status === 429) {
    return {
      ok: false,
      kind: 'rate_limited',
      retryAfterSeconds: parseRetryAfter(response.headers.get('Retry-After')),
    };
  }
  if (response.status === 404) return { ok: false, kind: 'not_found' };
  if (UNAVAILABLE_STATUSES.has(response.status)) return { ok: false, kind: 'unavailable' };
  if (response.status === 422) {
    const fields = parseFields(await readJson(response));
    if (fields) return { ok: false, kind: 'validation', fields };
  }
  return { ok: false, kind: 'unexpected' };
}

function send(path: string, init: ApiRequestInit, accept: string): Promise<Response> {
  const hasBody = init.body !== undefined;
  return fetch(`${apiBaseUrl()}${path}`, {
    method: init.method ?? 'GET',
    headers: hasBody ? { Accept: accept, 'Content-Type': 'application/json' } : { Accept: accept },
    body: hasBody ? JSON.stringify(init.body) : null,
    credentials: 'omit',
    signal: AbortSignal.timeout(init.timeoutMs ?? REQUEST_TIMEOUT_MS),
  });
}

/** Never throws: every failure is mapped to an `ApiResult` kind (architecture §4.4). */
export async function request<T>(
  path: string,
  init: ApiRequestInit,
  guard: Guard<T>,
): Promise<ApiResult<T>> {
  try {
    const response = await send(path, init, 'application/json');
    if (!response.ok) return await failureOf(response);
    const body = await readJson(response);
    return isRecord(body) && guard(body.data)
      ? { ok: true, data: body.data }
      : { ok: false, kind: 'unexpected' };
  } catch {
    // fetch (or a body read) rejects on network failure and on our own timeout abort.
    return { ok: false, kind: 'network' };
  }
}

/** Like `request`, for endpoints that answer with a file: success is the raw body as a Blob. */
export async function requestFile(
  path: string,
  init: ApiRequestInit,
  mimeType: string,
): Promise<ApiResult<Blob>> {
  try {
    const response = await send(path, init, mimeType);
    if (!response.ok) return await failureOf(response);
    const blob = await response.blob();
    // A proxy error page with a 200 must not be saved as the resume.
    return blob.type === mimeType ? { ok: true, data: blob } : { ok: false, kind: 'unexpected' };
  } catch {
    return { ok: false, kind: 'network' };
  }
}
