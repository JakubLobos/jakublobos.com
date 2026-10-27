export type InlineSegment =
  { kind: 'text'; text: string } | { kind: 'link'; label: string; href: string };

// The URL part has no whitespace or parentheses, so polishDeep's non-breaking spaces can never
// land inside it.
const LINK = /\[([^\]]+)\]\(([^\s()]+)\)/g;

function isHttps(href: string): boolean {
  try {
    return new URL(href).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Splits `text` into plain text and `[label](https://…)` links. Non-https links stay literal. */
export function parseInlineLinks(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let last = 0;
  let pending = '';
  for (const match of text.matchAll(LINK)) {
    const [whole, label = '', href = ''] = match;
    pending += text.slice(last, match.index);
    last = match.index + whole.length;
    if (isHttps(href)) {
      if (pending !== '') segments.push({ kind: 'text', text: pending });
      pending = '';
      segments.push({ kind: 'link', label, href });
    } else {
      pending += whole;
    }
  }
  pending += text.slice(last);
  if (pending !== '') segments.push({ kind: 'text', text: pending });
  return segments;
}
