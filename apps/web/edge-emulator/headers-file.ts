export interface HeaderRule {
  readonly pattern: string;
  readonly headers: readonly (readonly [name: string, value: string])[];
}

/** Cloudflare URL patterns: `*` is a greedy splat, `:name` a single path segment. */
export function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split(/(\*|:[A-Za-z]\w*)/)
    .map((part) => {
      if (part === '*') return '.*';
      if (part.startsWith(':')) return '[^/]+';
      return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return new RegExp(`^${source}$`);
}

/** Parses the `_headers` format: an unindented URL pattern, then indented `Name: value` lines. */
export function parseHeadersFile(text: string): HeaderRule[] {
  const rules: { pattern: string; headers: [string, string][] }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      rules.push({ pattern: raw.trim(), headers: [] });
      continue;
    }
    const current = rules.at(-1);
    const separator = raw.indexOf(':');
    if (current === undefined || separator === -1) {
      throw new Error(`Invalid _headers line: ${raw.trim()}`);
    }
    current.headers.push([raw.slice(0, separator).trim(), raw.slice(separator + 1).trim()]);
  }
  return rules;
}

/** Headers for a URL path. Several matching rules each add to a header, joined by `, ` as on Cloudflare. */
export function headersForPath(rules: readonly HeaderRule[], pathname: string): Headers {
  const headers = new Headers();
  for (const rule of rules) {
    if (!patternToRegExp(rule.pattern).test(pathname)) continue;
    for (const [name, value] of rule.headers) headers.append(name, value);
  }
  return headers;
}
