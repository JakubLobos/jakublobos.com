import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { ResumeReadResult, ResumeStore } from '../../domain/resume/resume-store.port.ts';
import { RESUME_MAX_BYTES, isAcceptableResume } from '../../domain/resume/resume.ts';

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/** Reads `<directory>/cv.pdf` (the Railway volume in production). */
export function createFileResumeStore(directory: string): ResumeStore {
  const path = join(directory, 'cv.pdf');
  return {
    async read(): Promise<ResumeReadResult> {
      try {
        // Checked before reading so an oversized file is never pulled into memory.
        if ((await stat(path)).size > RESUME_MAX_BYTES) return { kind: 'invalid' };
        const bytes = await readFile(path);
        return isAcceptableResume(bytes) ? { kind: 'found', bytes } : { kind: 'invalid' };
      } catch (error) {
        // Other I/O failures (permissions, a directory named cv.pdf) must not serve anything.
        return isNotFound(error) ? { kind: 'missing' } : { kind: 'invalid' };
      }
    },
  };
}
