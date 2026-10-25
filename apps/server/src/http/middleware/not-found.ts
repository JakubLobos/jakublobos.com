import type { RequestHandler } from 'express';
import { fail } from '../respond.ts';

export const notFound: RequestHandler = (_req, res) => {
  fail(res, { status: 404, code: 'NOT_FOUND', message: 'Not found' });
};
