// Subsets the display font ("Rubik Doodle Shadow") to the characters the site's display text can
// contain, so the hero heading no longer waits on ~330 KB of fonts (T-043, mobile Performance).
// Run manually: `pnpm fonts:subset`. The two outputs are committed; this is not part of verify.
//
// The fontsource files are not an installed dependency, so they are downloaded from a pinned
// version on jsDelivr. Glyph outlines are untouched; only unused glyphs are dropped.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const VERSION = '5.2.5';
const BASE = `https://cdn.jsdelivr.net/npm/@fontsource/rubik-doodle-shadow@${VERSION}/files`;
const OUT = fileURLToPath(new URL('../../apps/web/src/assets/fonts/', import.meta.url));

// Printable Basic Latin, Polish letters, typographic quotes/dashes, ellipsis, middle dot, NBSP.
// Every display-font text in the site (static i18n headings, labels, titles) fits in this set;
// no user input is ever rendered in the display font.
const CHARS =
  Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCodePoint(0x20 + i)).join('') +
  'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ„”“‘’–—…·\u00a0';

mkdirSync(OUT, { recursive: true });
for (const subset of ['latin', 'latin-ext']) {
  const response = await fetch(`${BASE}/rubik-doodle-shadow-${subset}-400-normal.woff2`);
  if (!response.ok) throw new Error(`download failed for ${subset}: ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());
  const subsetted = await subsetFont(source, CHARS, { targetFormat: 'woff2' });
  const file = `${OUT}rubik-doodle-shadow-${subset}-subset.woff2`;
  writeFileSync(file, subsetted);
  console.log(`${subset}: ${source.length} -> ${subsetted.length} bytes`);
}
