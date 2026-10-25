# T-033: Privacy policy and 404 pages

|                          |                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wave**                 | 5                                                                                                                                                          |
| **Depends on**           | T-021, T-023                                                                                                                                               |
| **Blocked by decisions** | none (D-07 approved; processors known: Cloudflare, Railway, OpenAI, Resend, Google Analytics, PostHog EU; mark the owner-specific details as placeholders) |
| **Parallel with**        | T-029, T-030, T-032, T-017                                                                                                                                 |
| **Size**                 | M                                                                                                                                                          |
| **Requirements**         | FR-02, NFR-06                                                                                                                                              |

## Objective

Provide the legally needed privacy policy (EN and PL drafts for owner and legal review) and friendly localized 404 pages in the site's visual language.

## References

- `docs/security.md` §8 (data table; the policy must reflect it exactly)
- `docs/research.md` §2 (OpenAI data handling facts)
- `docs/design-system.md` (reuse `SectionHeading`, body text styles; no new visual language)
- `docs/architecture.md` §6 (switcher alternates for these pages)

## Scope

- `components/pages/PrivacyPage.astro`: a long-form layout inside the normal chrome (main width, `SectionHeading` with a doodle title, body text 15/1.7, `h2`/`h3` hierarchy, tables styled with tokens).

  Content sections: controller and contact; what data, why, legal basis, and retention (exactly the `security.md` §8 table); processors and recipients — **Cloudflare** (site hosting/CDN), **Railway** (API hosting; state the region), **OpenAI** (moderation + suitability review; US transfer; retention per `security.md` §8), **Resend** (email delivery), **Cloudflare Turnstile** (bot check, loaded only when a visitor clicks "Show number"), **Google Analytics 4** (only with consent; US transfer), **PostHog EU** (full tracking with consent; cookieless counting otherwise — flagged for legal review); cookies and storage (`lang`, `jl-cookies`, `_ga*`, PostHog keys only after consent); the visitor's rights (access, rectification, erasure, objection, complaint to the PUODO supervisory authority); "last updated" date.

  Every placeholder is marked visibly in the source **and** listed in the report. A top-of-file comment states that the text is a draft requiring owner/legal review.

- `components/pages/NotFoundPage.astro`: a doodle heading ("Oops — nothing here" / PL draft), a short line, and primary `Button` home links (locale-aware). The mascot may be reused if available (optional, no new art).
- `messages/privacy.ts`, `messages/not-found.ts`.

## Allowed files

`apps/web/src/components/pages/{PrivacyPage,NotFoundPage}.astro`, `apps/web/src/i18n/messages/{privacy,not-found}.ts`.

## Acceptance criteria

- **AC-1** Both locales render; the language switcher on `/privacy` points to `/pl/privacy` and vice versa; SEO titles are set; `noindex` on 404 pages.
- **AC-2** The policy content matches `security.md` §8 (the reviewer cross-checks every row); placeholders are listed.
- **AC-3** Unknown URLs served by Express show the localized 404 (T-016 behaviour) with a working link home.
- **AC-4** Headings are in order and axe is clean. Readable line length (max ~70 ch).

## Validation

```
pnpm verify
pnpm preview   # visit /privacy, /pl/privacy, /nope, /pl/nope
```

## Definition of done

Standard DoD. The report flags the owner and legal review requirement prominently.
