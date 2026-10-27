// Writes docs/content/pl-copy-review.md: every EN/PL string pair for the owner's review.
//
// Usage: node tools/i18n/export-copy.ts
//
// AC-1: exits non-zero when a message or content module is not registered below, or when a
// module's EN and PL key sets differ. AC-2: lists PL strings equal to their EN counterpart and
// marks which of them are whitelisted proper nouns / technology names.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { experience } from '../../apps/web/src/content/experience.ts';
import { marqueeFacts, marqueeTech } from '../../apps/web/src/content/marquee.ts';
import { profile } from '../../apps/web/src/content/profile.ts';
import { projects } from '../../apps/web/src/content/projects.ts';
import { skillGroups } from '../../apps/web/src/content/skills.ts';
import { common } from '../../apps/web/src/i18n/messages/common.ts';
import { contactMessages } from '../../apps/web/src/i18n/messages/contact.ts';
import { cookies } from '../../apps/web/src/i18n/messages/cookies.ts';
import { errors } from '../../apps/web/src/i18n/messages/errors.ts';
import { experience as experienceMessages } from '../../apps/web/src/i18n/messages/experience.ts';
import { footer } from '../../apps/web/src/i18n/messages/footer.ts';
import { guestbook } from '../../apps/web/src/i18n/messages/guestbook.ts';
import { hero } from '../../apps/web/src/i18n/messages/hero.ts';
import { marquee } from '../../apps/web/src/i18n/messages/marquee.ts';
import { nav } from '../../apps/web/src/i18n/messages/nav.ts';
import { notFound } from '../../apps/web/src/i18n/messages/not-found.ts';
import { privacy } from '../../apps/web/src/i18n/messages/privacy.ts';
import { projectsMessages } from '../../apps/web/src/i18n/messages/projects.ts';
import { seo } from '../../apps/web/src/i18n/messages/seo.ts';
import { skillsMessages } from '../../apps/web/src/i18n/messages/skills.ts';

type Locale = 'en' | 'pl';
interface Pair {
  key: string;
  en: string;
  pl: string;
}
interface Area {
  name: string;
  source: string;
  pairs: Pair[];
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const NBSP = /\u00A0/g;
// Identifiers, block types and URLs, not prose.
const SKIP_KEYS = new Set(['id', 'href', 'type']);

/** PL equal to EN is expected for these: proper nouns, product and technology names. */
const WHITELIST = new Set([
  'Software Engineer',
  'Cookies',
  'Workflow',
  'Email',
  'jakublobos.com',
  'Jakub Łobos',
  'Railway',
  'Cloudflare',
  'Resend',
  'OpenAI',
  'PostHog',
  'Google Analytics 4',
  'GitHub',
  'LinkedIn',
  'GITHUB',
  'LINKEDIN',
  'Menu',
  'English',
  'Polski',
  'react',
  'typescript',
  'Google Analytics',
  'Item Shop Builder',
]);

/** Email addresses, storage names and job titles that contain a company name. */
const WHITELIST_PATTERN = /^[^\s@]+@[^\s@]+$|\((?:cookies?|local storage)\)$|^Software Engineer · /;

// ---- flattening ------------------------------------------------------------------------

/** Placeholders for message functions: any parameter renders as `{name}`. */
const sampleParams = new Proxy(
  {},
  { get: (_target, prop) => (typeof prop === 'string' ? `{${prop}}` : undefined) },
);

function plain(text: string): string {
  return text.replace(NBSP, ' ');
}

function flatten(value: unknown, path: string, out: Map<string, string>): void {
  if (typeof value === 'string') {
    out.set(path, plain(value));
  } else if (typeof value === 'function') {
    try {
      const rendered: unknown = (value as (params: unknown) => unknown)(sampleParams);
      out.set(path, plain(String(rendered)));
    } catch {
      out.set(path, '(function: could not be rendered with sample parameters)');
    }
  } else if (Array.isArray(value)) {
    value.forEach((item: unknown, index) => {
      flatten(item, `${path}[${index}]`, out);
    });
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      if (SKIP_KEYS.has(key)) continue;
      flatten(item, path === '' ? key : `${path}.${key}`, out);
    }
  }
}

function toMap(value: unknown): Map<string, string> {
  const out = new Map<string, string>();
  flatten(value, '', out);
  return out;
}

const failures: string[] = [];

function pairUp(source: string, en: unknown, pl: unknown): Pair[] {
  const enMap = toMap(en);
  const plMap = toMap(pl);
  for (const key of enMap.keys()) {
    if (!plMap.has(key)) failures.push(`${source}: PL is missing key "${key}"`);
  }
  for (const key of plMap.keys()) {
    if (!enMap.has(key)) failures.push(`${source}: PL has extra key "${key}"`);
  }
  return [...enMap].map(([key, enText]) => ({ key, en: enText, pl: plMap.get(key) ?? '' }));
}

function fromMessages(source: string, select: (locale: Locale) => unknown): Pair[] {
  return pairUp(source, select('en'), select('pl'));
}

// ---- registry --------------------------------------------------------------------------

const areas: Area[] = [];
function add(name: string, source: string, pairs: Pair[]): void {
  areas.push({ name, source, pairs });
}

add('Common', 'i18n/messages/common.ts', fromMessages('common', common));
add('Navigation', 'i18n/messages/nav.ts', fromMessages('nav', nav));
add('Hero', 'i18n/messages/hero.ts', fromMessages('hero', hero));
add('Marquee labels', 'i18n/messages/marquee.ts', fromMessages('marquee', marquee));
add('Projects labels', 'i18n/messages/projects.ts', fromMessages('projects', projectsMessages));
add('Skills labels', 'i18n/messages/skills.ts', fromMessages('skills', skillsMessages));
add(
  'Experience labels',
  'i18n/messages/experience.ts',
  fromMessages('experience', experienceMessages),
);
add('Guestbook', 'i18n/messages/guestbook.ts', fromMessages('guestbook', guestbook));
add('Contact', 'i18n/messages/contact.ts', fromMessages('contact', contactMessages));
add('Footer', 'i18n/messages/footer.ts', fromMessages('footer', footer));
add('Cookie banner', 'i18n/messages/cookies.ts', fromMessages('cookies', cookies));
add('Errors', 'i18n/messages/errors.ts', fromMessages('errors', errors));
add('404 page', 'i18n/messages/not-found.ts', fromMessages('not-found', notFound));
add('SEO and share image', 'i18n/messages/seo.ts', fromMessages('seo', seo));
add('Privacy policy', 'i18n/messages/privacy.ts', fromMessages('privacy', privacy));

add(
  'Content: experience',
  'content/experience.ts',
  experience.flatMap((entry) =>
    pairUp(`experience/${entry.id}`, entry.copy.en, entry.copy.pl).map((pair) => ({
      ...pair,
      key: `${entry.id}.${pair.key}`,
    })),
  ),
);
add(
  'Content: projects',
  'content/projects.ts',
  projects.flatMap((project) =>
    pairUp(
      `projects/${project.n}`,
      { title: project.title.en, paragraphs: project.paragraphs.en },
      { title: project.title.pl, paragraphs: project.paragraphs.pl },
    ).map((pair) => ({ ...pair, key: `${project.n}.${pair.key}` })),
  ),
);
add(
  'Content: skill groups',
  'content/skills.ts',
  skillGroups.map((group) => ({
    key: `group.${group.label.en}`,
    en: group.label.en,
    pl: plain(group.label.pl),
  })),
);
add('Content: marquee', 'content/marquee.ts', [
  ...marqueeTech.map((tech, index) => ({ key: `tech[${index}]`, en: tech, pl: tech })),
  ...pairUp('marquee facts', marqueeFacts.en, marqueeFacts.pl).map((pair) => ({
    ...pair,
    key: `facts${pair.key}`,
  })),
]);
add('Content: profile', 'content/profile.ts', [
  { key: 'role', en: profile.role.en, pl: profile.role.pl },
  { key: 'languages', en: profile.languages.en, pl: plain(profile.languages.pl) },
]);

// ---- AC-1: coverage --------------------------------------------------------------------

const covered = new Set(areas.map((area) => area.source));
for (const dir of ['i18n/messages', 'content']) {
  for (const file of readdirSync(`${root}apps/web/src/${dir}`)) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
    if (!covered.has(`${dir}/${file}`)) {
      failures.push(`apps/web/src/${dir}/${file} is not covered by tools/i18n/export-copy.ts`);
    }
  }
}
for (const area of areas) {
  if (area.pairs.length === 0) failures.push(`${area.source}: no strings exported`);
}

// ---- AC-2: PL equal to EN --------------------------------------------------------------

interface Same {
  area: string;
  pair: Pair;
  allowed: boolean;
}
const identical: Same[] = [];
for (const area of areas) {
  for (const pair of area.pairs) {
    if (pair.en !== pair.pl || pair.en.trim() === '') continue;
    const lastSegment = pair.key.split('.').pop() ?? '';
    const allowed =
      WHITELIST.has(pair.en) ||
      WHITELIST_PATTERN.test(pair.en) ||
      (area.name === 'Content: marquee' && pair.key.startsWith('tech')) ||
      lastSegment === 'domain';
    identical.push({ area: area.name, pair, allowed });
  }
}
const unexpected = identical.filter((item) => !item.allowed);

// ---- output ----------------------------------------------------------------------------

const cell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>') || ' ';

const total = areas.reduce((sum, area) => sum + area.pairs.length, 0);
const lines: string[] = [
  '# Polish copy review',
  '',
  '**Status: awaiting owner review.** Not approved. Approval is recorded in the sign-off table as a',
  'date and the word "approved" once the owner has gone through every row (T-034, AC-4).',
  '',
  '> Generated by `node tools/i18n/export-copy.ts`. Do not edit the EN or PL columns here: write the',
  '> fix in the "Owner correction" column; the agent applies it to the source modules and',
  '> regenerates this file. Non-breaking spaces (added automatically after single-letter words,',
  '> between numbers and units, and after "art.", "min." and similar) are shown as plain spaces.',
  '> `{name}` marks a value filled in at runtime. Address form is informal "Ty"; quotes are „…”;',
  '> a guestbook entry is a "wpis".',
  '',
  `Strings: ${total} across ${areas.length} areas.`,
  '',
  '## Owner sign-off',
  '',
  '| Date | Decision |',
  '| ---- | -------- |',
  '|      |          |',
  '',
  '## PL equal to EN',
  '',
  `${identical.length - unexpected.length} whitelisted (proper nouns, technology names), ` +
    `${unexpected.length} to check.`,
  '',
];
if (unexpected.length > 0) {
  lines.push('| Area | Key | Text |', '| ---- | --- | ---- |');
  for (const item of unexpected) {
    lines.push(`| ${item.area} | \`${item.pair.key}\` | ${cell(item.pair.en)} |`);
  }
  lines.push('');
}
for (const area of areas) {
  lines.push(
    `## ${area.name}`,
    '',
    `Source: \`apps/web/src/${area.source}\``,
    '',
    '| Key | EN | PL | Owner correction |',
    '| --- | -- | -- | ---------------- |',
  );
  for (const pair of area.pairs) {
    lines.push(`| \`${pair.key || '(value)'}\` | ${cell(pair.en)} | ${cell(pair.pl)} |   |`);
  }
  lines.push('');
}

if (failures.length > 0) {
  console.error(`Copy export failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

const outFile = `${root}docs/content/pl-copy-review.md`;
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${lines.join('\n')}\n`);
console.log(`Wrote ${outFile}: ${total} strings, ${areas.length} areas.`);
console.log(`PL equals EN for ${identical.length} strings (${unexpected.length} not whitelisted).`);
for (const item of unexpected) console.log(`  ${item.area} :: ${item.pair.key} :: ${item.pair.en}`);
