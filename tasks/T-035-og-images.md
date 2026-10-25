# T-035: Generated Open Graph images (EN and PL)

|                          |                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| **Wave**                 | 5                                                                                                |
| **Depends on**           | T-020 (dev-only route integration), T-021 (Seo.astro), T-024 (mascot, drips), T-040 (Playwright) |
| **Blocked by decisions** | none (D-15 answered: generated)                                                                  |
| **Parallel with**        | T-029…T-033, T-017, T-051                                                                        |
| **Size**                 | S                                                                                                |
| **Requirements**         | NFR-04                                                                                           |

## Objective

Produce share images (1200×630 PNG) for each locale that look unmistakably like the site, generated from the real components so they stay consistent with the design.

## References

- `docs/design-system.md` (tokens, fonts)
- `docs/design-analysis.md` §4.1 (logo), §4.5 (drips), §4.6 (mascot, headline)
- `apps/web/integrations/dev-showcase.ts` (the dev-only route pattern)

## Scope

- `apps/web/src/dev/og.astro`: a dev-only route `/__og/[locale]` (injected by the existing dev integration, never built for production). A 1200×630 canvas with the grid background, top paint drips, the logo, the mascot, the headline (display font) and localized subtitle ("Frontend Developer · React & TypeScript"), and `jakublobos.com`. Uses tokens only.
- `tools/og/render-og.ts`: Playwright starts against `astro dev` (or reuses a running one), screenshots each locale at device scale 1 with reduced motion, and writes `apps/web/public/og/og-en.png` and `og-pl.png` (≤ 300 KB each; optimized with Playwright's PNG output, no extra dependency).
- Root script `og:generate`.
- `Seo.astro`: `og:image` (absolute URL), `og:image:width`/`height`/`alt` (localized), `twitter:card=summary_large_image` (allowed edit).
- Commit the generated PNGs.

## Allowed files

`apps/web/src/dev/og.astro`, `apps/web/integrations/dev-showcase.ts` (add the route), `tools/og/**`, `apps/web/public/og/*.png`, `apps/web/src/components/seo/Seo.astro` (OG image tags only), `apps/web/src/i18n/messages/seo.ts` (alt text), root `package.json` (script).

## Acceptance criteria

- **AC-1** Both PNGs are exactly 1200×630, under 300 KB, with legible text at thumbnail size (attach both images to the report).
- **AC-2** `/__og/en` doesn't exist in the production build.
- **AC-3** Built pages reference the locale's image with an absolute `https://jakublobos.com/og/og-{locale}.png` URL in production builds.
- **AC-4** Regeneration is deterministic: running twice produces visually identical images.

## Validation

```
pnpm verify
pnpm og:generate
```

## Definition of done

Standard DoD plus both images in the report.
