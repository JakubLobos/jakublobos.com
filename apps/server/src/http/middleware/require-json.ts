import express, { type RequestHandler } from 'express';
import { fail } from '../respond.ts';

/** POST bodies must be JSON; this also forces a CORS preflight from browsers. */
export const requireJson: RequestHandler = (req, res, next) => {
  if (req.is('application/json') === 'application/json') {
    next();
    return;
  }
  fail(res, {
    status: 415,
    code: 'UNSUPPORTED_MEDIA_TYPE',
    message: 'Content-Type must be application/json',
  });
};

/** Content-type gate plus size-limited strict JSON parsing. Mount per route with its own limit. */
export function jsonBody(limit: string | number): RequestHandler[] {
  return [requireJson, express.json({ limit, strict: true, type: 'application/json' })];
}
