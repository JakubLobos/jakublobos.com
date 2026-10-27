import { describe, expect, it } from 'vitest';
import { parseInlineLinks } from './inline-link.ts';
import { polishDeep } from './pl-typography.ts';

describe('parseInlineLinks', () => {
  it('splits text around an https link', () => {
    expect(parseInlineLinks('a [Foo](https://foo.io/) b')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'link', label: 'Foo', href: 'https://foo.io/' },
      { kind: 'text', text: ' b' },
    ]);
  });

  it('returns plain text unchanged', () => {
    expect(parseInlineLinks('nothing here')).toEqual([{ kind: 'text', text: 'nothing here' }]);
  });

  it('keeps non-https links as literal text', () => {
    for (const bad of ['http://x.io', 'javascript:alert(1)', 'mailto:a@b.c', '/relative']) {
      const input = `x [l](${bad}) y`;
      expect(parseInlineLinks(input)).toEqual([{ kind: 'text', text: input }]);
    }
  });

  it('leaves the URL intact after Polish typography', () => {
    const typo = polishDeep('w [Pterodactylu](https://pterodactyl.io/) i o nim');
    const link = parseInlineLinks(typo).find((s) => s.kind === 'link');
    expect(link).toEqual({ kind: 'link', label: 'Pterodactylu', href: 'https://pterodactyl.io/' });
  });
});
