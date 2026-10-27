# T-060 implementation report (round 3)

- Moved the six `hero-*` keyframes (and the glyph-clip comment) from `Hero.astro` to `apps/web/src/styles/motion/hero.css`, imported in Hero's frontmatter. The scoped rules stay in `<style>`. Updated `docs/design-system.md` §2.8 and the spec's Allowed files.
- Merged `origin/main` (no rebase): the merge was clean. `Hero.astro` keeps the `.sticker` wrapper, `data-confetti` on the resume button and the confetti script; `tokens.css` keeps `--z-confetti` and the motion tokens.
- Evidence: `pnpm verify` green (`Budgets OK.`; index CSS 11.9 / 25 KB, JS 15.2 / 35 KB). Against the production build (`astro preview`, port 4401), all six `hero-*` animations run on load, and clicking the resume button adds the confetti canvas.
