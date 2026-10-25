# ADR-0008: Plain CSS with custom-property tokens (no Tailwind)

- **Status:** Accepted · **Date:** 2026-10-25 · **Related:** NFR-01, design-system.md

## Context

The design has a bespoke visual language: hard offset shadows, organic radii, clamp-based fluid type, CSS-drawn illustrations, about 30 colour roles, and exact pixel spacing. Fidelity matters more than utility speed.

## Decision

Custom properties in `tokens.css` (semantic roles + paint palette), a small global layer (`base.css`, `utilities.css`, `keyframes.css`), and component-scoped `<style>` in Astro components. Fonts come from the Astro Fonts API with `cssVariable`s.

## Alternatives considered

| Option                        | Why not                                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind 4                    | Many one-off values would become arbitrary-value classes (`shadow-[0_6px_0_#1a3f94]`), so the token discipline erodes; extra toolchain; CSP-neutral but little benefit for a single page |
| CSS Modules / vanilla-extract | Astro scoped styles already give isolation; extra tooling                                                                                                                                |
| Sass                          | Native CSS nesting and custom properties cover the needs                                                                                                                                 |

## Consequences

- Tokens are the single source; reviewers grep for raw values (design-system.md §3).
- Breakpoints can't be variables in media queries, so they're documented constants mirrored in `lib/breakpoints.ts`.
