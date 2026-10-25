import { readFileSync } from 'node:fs';
import { Writable } from 'node:stream';
import { createLogger } from '../../logger.ts';
import type { FetchFn } from './http.ts';

const FIXTURES = new URL('../../../test/fixtures/', import.meta.url);

export function fixtureText(relativePath: string): string {
  return readFileSync(new URL(relativePath, FIXTURES), 'utf8');
}

export function fixtureJson(relativePath: string): unknown {
  return JSON.parse(fixtureText(relativePath)) as unknown;
}

export interface RecordedCall {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export type FetchHandler = (signal: AbortSignal) => Response | Promise<Response>;

/** Records every request and answers with the handler. No real network is ever touched. */
export function createFetchStub(handler: FetchHandler): { fetch: FetchFn; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetchStub: FetchFn = (input, init) => {
    const signal = init?.signal ?? new AbortController().signal;
    calls.push({
      url: input instanceof Request ? input.url : input.toString(),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
    });
    return Promise.resolve(handler(signal));
  };
  return { fetch: fetchStub, calls };
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(text, { status, headers });
}

/** A request that never answers; it only ends when the provider aborts it (the timeout). */
export function hangUntilAborted(signal: AbortSignal): Promise<Response> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
    });
  });
}

export function captureLogger(): { logger: ReturnType<typeof createLogger>; output: () => string } {
  let captured = '';
  const destination = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      captured += chunk.toString();
      callback();
    },
  });
  return { logger: createLogger({ level: 'trace', destination }), output: () => captured };
}
