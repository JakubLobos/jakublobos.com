import { describe, expect, it } from 'vitest';
import type { ConsentState } from '../consent.ts';
import { createConsentDriver } from './driver.ts';

function setup() {
  const calls: string[] = [];
  const apply = createConsentDriver({
    ga4: { load: () => calls.push('ga4.load'), unload: () => calls.push('ga4.unload') },
    posthog: { optIn: () => calls.push('ph.in'), optOut: () => calls.push('ph.out') },
  });
  const run = (...states: ConsentState[]) => {
    for (const state of states) apply(state);
    return calls;
  };
  return { calls, run };
}

describe('createConsentDriver', () => {
  it('does nothing while consent is unknown', () => {
    expect(setup().run('unknown', 'unknown')).toEqual([]);
  });

  it('unknown -> all loads GA4 and opts PostHog in', () => {
    expect(setup().run('all')).toEqual(['ga4.load', 'ph.in']);
  });

  it('unknown -> essential never touches GA4 and opts PostHog out', () => {
    expect(setup().run('essential')).toEqual(['ph.out']);
  });

  it('all -> essential unloads GA4 and opts PostHog out', () => {
    expect(setup().run('all', 'essential').slice(2)).toEqual(['ga4.unload', 'ph.out']);
  });

  it('essential -> all loads GA4 and opts PostHog in', () => {
    expect(setup().run('essential', 'all').slice(1)).toEqual(['ga4.load', 'ph.in']);
  });

  it('treats a vanished stored value after `all` as a withdrawal', () => {
    expect(setup().run('all', 'unknown').slice(2)).toEqual(['ga4.unload', 'ph.out']);
  });

  it('ignores a repeated state', () => {
    expect(setup().run('all', 'all')).toEqual(['ga4.load', 'ph.in']);
  });

  it('skips a provider without a port', () => {
    const calls: string[] = [];
    const apply = createConsentDriver({
      posthog: { optIn: () => calls.push('in'), optOut: () => calls.push('out') },
    });
    apply('all');
    apply('essential');
    expect(calls).toEqual(['in', 'out']);
  });
});
