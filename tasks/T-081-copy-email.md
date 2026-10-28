# T-081: Email links copy the address

- **Wave:** 8 (go-live) · **Size:** S · **Depends on:** T-079
- **Owner decision (2026-10-28, D-36):** few visitors use `mailto:`. Clicking the owner's email address copies it to the clipboard and shows a short, tasteful paper-style confirmation.

## Behaviour

- Every link to `profile.email` carries `data-copy-email`: header social aside, mobile menu (button and social link), contact details row and the privacy page. The hero no-JS resume note keeps a plain `mailto:`.
- Progressive enhancement: the markup stays `<a href="mailto:…">`. One site-wide script, `scripts/copy-email.ts`, loaded from the base layout (via `CopyEmail.astro`).
- A plain primary click (button 0, no modifier keys) calls `preventDefault()` and `navigator.clipboard.writeText`. On success it shows the tag and announces; on rejection it falls back to `location.href = link.href`. Without the clipboard API the default navigation runs.
- Accessible description: the script sets `aria-describedby` to a visually hidden "Copies the address" (EN/PL). One shared polite live region announces "Email address copied".
- Tag: `scripts/copy-toast.ts` (DOM, placement, timing), keyframes in `styles/motion/copy-tag.css`, pure placement in `lib/copy-tag-position.ts`. Out of flow, `pointer-events: none`, `aria-hidden`, top layer (popover) so it also shows over the modal menu. Repeated clicks restart it.

## Allowed files

The files named above, `i18n/messages/common.ts`, the components that render the email links, `docs/decisions/open-questions.md`, `docs/design-system.md`, `docs/content/pl-copy-review.md`.

## Acceptance criteria

1. Clicking each marked link copies `hello@jakublobos.com` and shows the tag, which disappears after about 2 s.
2. Rejected or missing clipboard: the `mailto:` navigation proceeds. Ctrl/Cmd/Shift/middle clicks are untouched.
3. Reduced motion: no stick animation. Forced colors: bordered, readable.
4. EN + PL copy; axe clean; `pnpm verify` green.

## Validation

- `pnpm verify`.
- Throwaway Playwright script (not committed) against `astro preview --port 4416`.
