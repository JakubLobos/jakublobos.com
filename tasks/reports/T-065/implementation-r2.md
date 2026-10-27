# T-065 implementation report, round 2

Owner follow-up: the EN headline is now "Engineering centered around the user" (no trailing period, matching PL). PL is unchanged.

## Changed files

- `apps/web/src/i18n/messages/hero.ts`: EN `title`.
- `apps/web/src/i18n/messages/seo.ts`: EN `og.alt` quote.
- `docs/content/pl-copy-review.md`: EN column of the hero `title` and `og.alt` rows.
- `apps/web/public/og/og-en.png`: regenerated with `pnpm og:generate` (107922 bytes). Viewed: 2 balanced lines, fully inside the card, no clipping.

The round-1 report and spec still name the earlier headline; they are the historical record and were left as they were.

## Hero check (built site, port 4405 only, process killed afterwards)

| Locale and width | html scrollWidth/clientWidth | h1 scrollWidth/clientWidth | h1 height |
| ---------------- | ---------------------------- | -------------------------- | --------- |
| EN 390           | 390/390                      | 350/350                    | 132       |
| EN 1440          | 1440/1440                    | 856/856                    | 150       |

No overflow. The shorter line wraps to fewer lines, so the round-1 clip-path inset check still holds. No CSS changes.

## `pnpm verify`

Green (exit 0, Budgets OK).
