# CTA Copy Review — Changeset

Task ID: `2026-04-24-cta-copy-review`

## Context

After the Services page moved from "Take the Quiz" to "Find Your Fit", the owner
requested a site-wide review of CTAs for copy quality and cross-page
consistency. The changeset below was approved in chat (review conducted through
four lenses: conversion psychology, context congruence, microcopy energy, brand
voice).

Out of scope — worked on in parallel sessions and not touched here:

- `src/pages/services/index.astro`
- `src/pages/success-stories/[slug].astro`

## Copy changes (11 edits)

| File                                                                 | Current                     | New                                                    |
| :------------------------------------------------------------------- | :-------------------------- | :----------------------------------------------------- |
| `src/pages/index.astro` — Hero primary (~line 49)                    | `Start with Team 4 Pro`     | `Work With Us`                                         |
| `src/pages/index.astro` — Hero secondary (~line 50)                  | `Learn about our Services`  | `Explore Services`                                     |
| `src/pages/index.astro` — Quiz trigger (~line 38)                    | `Take the Quiz`             | `Find Your Fit`                                        |
| `src/pages/coaches/index.astro` — Hero secondary (~line 43)          | `View Our Services`         | `Explore Services`                                     |
| `src/pages/coaches/index.astro` — Bottom primary (~line 111)         | `Contact Us`                | `Find Your Coach`                                      |
| `src/pages/coaches/index.astro` — Bottom secondary (~line 112)       | `View Services`             | `Explore Services`                                     |
| `src/pages/success-stories/index.astro` — Bottom primary (~line 103) | `Start Your Transformation` | `Ready to Be Next?`                                    |
| `src/components/sections/coaches/CoachDetailModal.astro` (~line 116) | `Start Your Journey`        | `Work with {coach.firstName}` (personalized per coach) |
| `src/components/sections/quiz/QuizModal.astro` (~line 203)           | `View This Service`         | `See This Program`                                     |
| `src/data/contact.ts` — `contactSection.form.submitLabel`            | `Send Message`              | `Send My Message`                                      |
| `src/data/thanks.ts` — `thanksPage.backButton.label`                 | `Back to Home`              | `Back to Homepage`                                     |

Line numbers are from the most recent inventory pass and may shift — the
implementer verifies by reading each file and matches on the full current
string, not the line.

### Items intentionally kept

- Homepage Final CTA ("Start Your Journey" / "Explore Services" — from `cta.ts`)
- How-it-Works primaries ("Book a Free Consultation") — the owner confirmed the
  contact flow leads to a real consultation (WhatsApp intake call)
- Success-Stories Hero primary ("Start Your Transformation") — only the Bottom
  primary on the same page varies, Hero stays
- ServiceCard ("Get Started"), Coach cards ("Meet {firstName}"),
  SuccessStoryGridCard ("Read full story"), Quiz navigation (Next / Back / Start
  Over), Quiz result secondary ("Get in Touch")

## Convention note

Add a short subsection to `docs/CONVENTIONS.md` (placement: at the end of the
existing copy/content guidance, or as its own "CTA copy" subsection — the
implementer matches the existing document structure):

> **CTA copy conventions:**
>
> - Secondary links that lead to `/services` from pages other than the Services
>   page itself use **"Explore Services"** as the label.
> - Quiz-trigger buttons (those that open the Quiz Modal) use **"Find Your
>   Fit"**.

Only these two conventions are codified — other CTA labels remain
page-contextual by design. Variation where it carries meaning is preferred over
uniform labels.

## Commit plan

One concern per commit, in this order:

1. `docs(work): add CTA copy review changeset` — this spec file only
2. `content(data): refresh contact submit and thanks back-button labels` —
   `src/data/contact.ts`, `src/data/thanks.ts`
3. `content(home): refresh homepage CTAs` — `src/pages/index.astro` (three
   edits: Hero primary, Hero secondary, Quiz trigger)
4. `content(coaches): refresh page and modal CTAs` —
   `src/pages/coaches/index.astro` (three edits) +
   `src/components/sections/coaches/CoachDetailModal.astro` (personalized
   `Work with {coach.firstName}`)
5. `content(success-stories): vary bottom CTA from hero` —
   `src/pages/success-stories/index.astro` (one edit)
6. `content(quiz): rename result primary to "See This Program"` —
   `src/components/sections/quiz/QuizModal.astro` (one edit)
7. `docs(conventions): add CTA copy conventions for secondaries and quiz trigger`
   — `docs/CONVENTIONS.md`

## Implementation notes

- **Personalized coach CTA (commit 4):** `Work with {coach.firstName}` needs the
  coach's first name available in the modal's Astro frontmatter. Read
  `CoachDetailModal.astro` first and confirm whether the coach prop is already
  in scope (the existing "Meet {firstName}" pattern in `CoachCardCompact.astro`
  / `CoachCardExpanded.astro` uses `coach.firstName` directly from props). If
  the modal renders per-coach with the full coach object passed in, the change
  is trivial — a template expression swap. If the modal is a single shared
  instance populated by JS at click time, escalate before editing.
- **Line numbers in the table above are hints, not commitments.** Read each file
  and match on the full current string.
- **No structural changes, no new components, no pattern introduction.**
- **Biome:** run `pnpm format` before `pnpm check` for any touched
  markdown/astro/ts files.

## Validation

- `pnpm check` passes (typecheck + lint + tests)
- Manual check in dev server: each touched page renders the new CTA text as
  expected; Coach-Detail-Modal shows the personalized label per coach.

## Out-of-scope notes (for the backlog, not this branch)

- Service names `"I'm New to This"` and `"I'm Too Busy"` read as first-person
  CTA answers rather than service names. Inconsistent with the other service
  names on the Services page. Candidate for a separate review — not part of this
  changeset.
