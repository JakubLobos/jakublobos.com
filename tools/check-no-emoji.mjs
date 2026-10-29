// Fails when a tracked text file contains an emoji (AGENTS.md rule 8, D-37).
// Copyright, registered and trademark signs are ordinary text and allowed.
//
// Usage: node tools/check-no-emoji.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Test data that exercises emoji handling of user input (visitors may type emoji).
const EXEMPT = [
  'apps/server/src/domain/guestbook/quality-rules.ts',
  'apps/server/src/domain/guestbook/quality-rules.test.ts',
  /^apps\/server\/test\/fixtures\/guestbook\/.+\.txt$/,
  'apps/web/src/lib/text-diff.test.ts',
  // Reports that quote the test strings above as data.
  'tasks/reports/T-010/review-r2.md',
  'tasks/reports/T-013/implementation-r2.md',
  'tasks/reports/T-013/review-r1.md',
];
const SKIP =
  /\.(png|jpe?g|webp|avif|gif|ico|woff2?|ttf|pdf|svg)$|(^|\/)design\.html$|pnpm-lock\.yaml$/;
const TEXT_SIGNS = new Set(['©', '®', '™']);
const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{FE0F}]/gu;

const isExempt = (file) =>
  EXEMPT.some((entry) => (typeof entry === 'string' ? entry === file : entry.test(file)));

const files = execSync('git ls-files -z', { maxBuffer: 1 << 28 })
  .toString()
  .split('\0')
  .filter(Boolean);
const offenders = [];
for (const file of files) {
  if (SKIP.test(file) || isExempt(file)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const found = (text.match(EMOJI) ?? []).filter((char) => !TEXT_SIGNS.has(char));
  if (found.length > 0) offenders.push(`${file}: ${found.length} emoji`);
}

if (offenders.length > 0) {
  console.error(
    `Emoji are not allowed (AGENTS.md rule 8). Use words or an inline SVG icon:\n${offenders.join('\n')}`,
  );
  process.exit(1);
}
console.log('check-no-emoji: ok');
