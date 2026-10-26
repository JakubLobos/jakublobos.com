import { describe, expect, it } from 'vitest';
import { createGa4, expireGaCookies } from './ga4.ts';

function setup() {
  const dataLayer: unknown[] = [];
  const disabled = new Map<string, boolean>();
  const scripts: string[] = [];
  let layerRequests = 0;
  let cleared = 0;
  const ga4 = createGa4('G-TEST123', {
    dataLayer: () => {
      layerRequests += 1;
      return dataLayer;
    },
    setDisabled: (id, value) => {
      disabled.set(id, value);
    },
    injectScript: (src) => {
      scripts.push(src);
    },
    clearCookies: () => {
      cleared += 1;
    },
  });
  const commands = () => dataLayer.map((entry) => Array.from(entry as ArrayLike<unknown>));
  return {
    ga4,
    dataLayer,
    disabled,
    scripts,
    commands,
    layerRequests: () => layerRequests,
    cleared: () => cleared,
  };
}

describe('createGa4', () => {
  it('touches nothing until load', () => {
    const { scripts, layerRequests, disabled } = setup();
    expect(layerRequests()).toBe(0);
    expect(disabled.size).toBe(0);
    expect(scripts).toEqual([]);
  });

  it('configures in bundled code, then injects gtag.js once', () => {
    const { ga4, scripts, commands } = setup();
    ga4.load();

    expect(commands()).toEqual([
      ['js', expect.any(Date)],
      ['config', 'G-TEST123', { anonymize_ip: true }],
    ]);
    expect(scripts).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-TEST123']);
  });

  it('queues commands as arguments objects, which is what gtag.js reads', () => {
    const { ga4, dataLayer } = setup();
    ga4.load();
    expect(Array.isArray(dataLayer[0])).toBe(false);
    expect(Object.prototype.toString.call(dataLayer[0])).toBe('[object Arguments]');
  });

  it('unload disables further hits and clears cookies', () => {
    const { ga4, disabled, cleared } = setup();
    ga4.load();
    ga4.unload();
    expect(disabled.get('G-TEST123')).toBe(true);
    expect(cleared()).toBe(1);
  });

  it('re-accepting re-enables sending without a second script', () => {
    const { ga4, disabled, scripts, commands } = setup();
    ga4.load();
    ga4.unload();
    ga4.load();

    expect(disabled.get('G-TEST123')).toBe(false);
    expect(scripts).toHaveLength(1);
    expect(commands().filter(([name]) => name === 'config')).toHaveLength(2);
    expect(commands().filter(([name]) => name === 'js')).toHaveLength(1);
  });
});

describe('expireGaCookies', () => {
  it('expires only Google Analytics cookies, on the host and each parent domain', () => {
    const header = '_ga=GA1.1.1; theme=dark; _ga_ABC123=GS1; _gid=x; jl-session=1';
    const result = expireGaCookies(header, 'www.example.com');

    expect(result).toEqual([
      '_ga=; Max-Age=0; Path=/',
      '_ga=; Max-Age=0; Path=/; Domain=www.example.com',
      '_ga=; Max-Age=0; Path=/; Domain=example.com',
      '_ga_ABC123=; Max-Age=0; Path=/',
      '_ga_ABC123=; Max-Age=0; Path=/; Domain=www.example.com',
      '_ga_ABC123=; Max-Age=0; Path=/; Domain=example.com',
      '_gid=; Max-Age=0; Path=/',
      '_gid=; Max-Age=0; Path=/; Domain=www.example.com',
      '_gid=; Max-Age=0; Path=/; Domain=example.com',
    ]);
  });

  it('leaves look-alike names alone', () => {
    expect(expireGaCookies('_gallery=1; ga=2; x_ga=3', 'example.com')).toEqual([]);
  });

  it('uses host-only expiry for a single-label host', () => {
    expect(expireGaCookies('_ga=1', 'localhost')).toEqual(['_ga=; Max-Age=0; Path=/']);
  });
});
