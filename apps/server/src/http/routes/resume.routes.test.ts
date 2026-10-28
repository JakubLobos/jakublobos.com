import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RESUME_MAX_BYTES } from '../../domain/resume/resume.ts';
import { FakeClock } from '../../domain/shared/clock.ts';
import { createFileResumeStore } from '../../infra/resume/file.resume-store.ts';
import { createFakeVerifier } from '../../infra/verification/fake.verifier.ts';
import { ALLOWED_ORIGIN, buildTestApp } from '../../test-support/test-app.ts';
import { createGlobalCap } from '../rate-limit.ts';
import { createResumeRoutes, type ResumeRoutesDeps } from './resume.routes.ts';

// A generated stand-in: the owner's real CV never enters the repository or its tests.
const DUMMY_PDF = Buffer.from('%PDF-1.4\n% dummy resume for tests\n%%EOF\n');

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'resume-test-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function setup(overrides: Partial<ResumeRoutesDeps> = {}) {
  const built = buildTestApp({
    routes: [
      createResumeRoutes({
        verifier: createFakeVerifier(),
        store: createFileResumeStore(directory),
        clientIpSource: 'socket',
        ...overrides,
      }),
    ],
  });
  const download = (token: unknown = 'pass') =>
    request(built.app)
      .post('/api/resume')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ turnstileToken: token })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      });
  return { ...built, download };
}

/** The download helper parses every body as raw bytes, so errors are decoded here. */
function errorCode(res: { body: unknown }): unknown {
  const parsed: unknown = JSON.parse(String(res.body));
  if (typeof parsed !== 'object' || parsed === null || !('error' in parsed)) return undefined;
  const { error } = parsed;
  return typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
}

describe('POST /api/resume', () => {
  it('serves the PDF with download headers after a verified token', async () => {
    await writeFile(join(directory, 'cv.pdf'), DUMMY_PDF);
    const res = await setup().download();
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('attachment; filename="Jakub_Lobos_CV.pdf"');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.isBuffer(res.body) && res.body.equals(DUMMY_PDF)).toBe(true);
  });

  it('answers 503 RESUME_UNAVAILABLE with Retry-After when no file was uploaded', async () => {
    const { download, logs } = setup();
    const res = await download();
    expect(res.status).toBe(503);
    expect(errorCode(res)).toBe('RESUME_UNAVAILABLE');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(logs()).toContain('resume file is not configured');
  });

  it('refuses a file that is not a PDF, and logs a warning without its path', async () => {
    await writeFile(join(directory, 'cv.pdf'), 'MZ not a pdf');
    const { download, logs } = setup();
    const res = await download();
    expect(res.status).toBe(503);
    expect(errorCode(res)).toBe('RESUME_UNAVAILABLE');
    expect(logs()).toContain('not an acceptable PDF');
    expect(logs()).not.toContain(directory);
  });

  it('refuses a PDF over 5 MB', async () => {
    const big = Buffer.alloc(RESUME_MAX_BYTES + 1);
    big.write('%PDF-');
    await writeFile(join(directory, 'cv.pdf'), big);
    expect((await setup().download()).status).toBe(503);
  });

  it('treats a directory named cv.pdf as unusable instead of crashing', async () => {
    await mkdir(join(directory, 'cv.pdf'));
    expect((await setup().download()).status).toBe(503);
  });

  it('rejects an invalid token with 403 and sends no file', async () => {
    await writeFile(join(directory, 'cv.pdf'), DUMMY_PDF);
    const res = await setup().download('forged');
    expect(res.status).toBe(403);
    expect(errorCode(res)).toBe('VERIFICATION_FAILED');
    expect(String(res.body)).not.toContain('%PDF');
  });

  it('answers 503 VERIFICATION_UNAVAILABLE when the verifier is down', async () => {
    const res = await setup({
      verifier: { verify: () => Promise.resolve({ kind: 'unavailable' }) },
    }).download();
    expect(res.status).toBe(503);
    expect(errorCode(res)).toBe('VERIFICATION_UNAVAILABLE');
  });

  it('answers 422 for a missing token without calling the verifier', async () => {
    const res = await setup({
      verifier: { verify: () => Promise.reject(new Error('must not be called')) },
    }).download('');
    expect(res.status).toBe(422);
    expect(errorCode(res)).toBe('VALIDATION_FAILED');
  });

  it('limits each client to 5 requests per 10 minutes', async () => {
    await writeFile(join(directory, 'cv.pdf'), DUMMY_PDF);
    const { download } = setup();
    for (let i = 0; i < 5; i += 1) expect((await download()).status).toBe(200);
    const res = await download();
    expect(res.status).toBe(429);
    expect(errorCode(res)).toBe('RATE_LIMITED');
  });

  it('answers 503 once the global daily cap is spent', async () => {
    await writeFile(join(directory, 'cv.pdf'), DUMMY_PDF);
    const globalCap = createGlobalCap({
      windows: [{ windowMs: 86_400_000, limit: 1 }],
      clock: new FakeClock(0),
    });
    const { download } = setup({ globalCap });
    expect((await download()).status).toBe(200);
    const res = await download();
    expect(res.status).toBe(503);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });
});
