# Review: CTA Copy Review

**Task ID:** 2026-04-24-cta-copy-review **Round:** 1 **Patch Scope:** Site-wide
CTA copy refresh — 10 label changes across 7 code files, one new CONVENTIONS
subsection, one spec doc. **State:** 4b5516f0dc65481af0775564a30116689f747715

## Blockers

None.

## Major

None.

## Minor

### `src/components/ui/Button.astro:22`, `src/components/ui/CTA.astro:29`, `src/components/ui/CtaButton.astro:15`, `src/components/sections/Services.astro:21`, `src/components/sections/quiz/QuizModal.astro:22`, `src/types/components.ts:117` — JSDoc examples still show the retired "Take the Quiz" / "Take Quiz" label

Problem: Six JSDoc `@example` blocks across UI and section components continue
to use the old pre-"Find Your Fit" wording as their illustration. Harmless at
runtime, but a future maintainer copy-pasting from a docstring will reintroduce
the legacy label and break the convention just codified in
`docs/CONVENTIONS.md`. This is exactly the drift risk the new convention exists
to prevent. Recommendation: Sweep docstring example labels to `"Find Your Fit"`
(for quiz triggers) in a follow-up commit on this branch, or log as a dedicated
debt item if owner prefers to keep the review tight. Not within the spec's
10-edit scope, but the new convention makes these examples actively misleading.

## Nit

### `docs/CONVENTIONS.md:189` — example label `"Start Your Journey"` is the only one whose pairing isn't self-evident

Problem: The rationale paragraph cites `"Find Your Coach"` and
`"Start Your Journey"` as page-contextual primaries. `"Find Your Coach"` clearly
comes from coaches/index; `"Start Your Journey"` currently lives in
`src/data/cta.ts` (homepage Final CTA) and the descoped
`CoachDetailModal.astro`. Not wrong, just less traceable than the first example.
Recommendation: Optional — either leave as-is or swap for a primary whose source
is more obvious (e.g., `"Work With Us"` from the homepage hero). Pure polish.

## Not Reviewed

- **TypeScript strictness** — no type-surface changes (labels are plain string
  literals inside existing `as const satisfies` shapes, compiled clean via
  `astro check`).
- **Performance** — pure text replacement, no bundle or runtime impact.
- **Accessibility** — labels remained descriptive, no ARIA/role changes, no
  structural markup touched. No regression plausible.
- **Tailwind v4** — no class changes.
- **Astro idioms** — no new components, no slot patterns, no directive use.
- **Test coverage** — copy strings are not testable behavior on this codebase
  (no snapshot/visual-regression harness); existing tests (`244 passed`)
  exercise the flows these labels sit in and continue to pass.

## Praise

- Descoping the `CoachDetailModal` personalization was the right call. The modal
  is `is:inline` with JS-assigned text
  (`ctaEl.textContent = 'Start Your Journey'` at line 242), so a clean
  personalization requires the ADR-0020 migration first. Bundling that into this
  branch would have inflated a copy task into a script-migration task. The
  implementer caught this and escalated; the result is a tight, reviewable diff.
- Every one of the ten copy edits is the exact string the spec prescribes — no
  typo, no casing drift, no accidental punctuation. Spot-checks against
  surrounding context (headlines, descriptions, section purpose) show the new
  labels fit their frames (e.g., `"Find Your Coach"` under "Have Questions?
  Let's Talk" landing on contact, `"Ready to Be Next?"` under "Ready to Write
  Your Success Story?").
- Commit graph is linear, one-concern-per-commit, conventional-commits
  compliant, no session jargon in bodies, ordered to minimize dependency anxiety
  (data modules first, pages next, convention doc last).
- `"Explore Services"` is consistent across all six secondary slots that point
  at `/services` (home hero, how-it-works, coaches hero + bottom,
  success-stories bottom, cta.ts Final CTA). Zero drift. The new convention
  describes reality, not aspiration.
- `pnpm check` and `pnpm test:run` both pass clean on HEAD (`4b5516f`).

## Scope Verification

- Seven code files touched, all in the spec's scope table. No accidental
  formatter-churn.
- The two parallel-session files (`src/pages/services/index.astro`,
  `src/pages/success-stories/[slug].astro`) do **not** appear in the diff.
  Confirmed via `git diff --stat main..HEAD`.
- `src/components/sections/coaches/CoachDetailModal.astro` is untouched on this
  branch (verified — lines 116 and 242 still carry `"Start Your Journey"`).
  Consistent with the approved descope.
- Commitlint-vs-`content(...)` drift acknowledged: commits 2–6 use `fix(...)`,
  commit 7 uses `docs(...)`. Correct mitigation given the current commitlint
  config.
- No hardcoded paths introduced — every `href` still flows through `routes.ts` /
  `homeAnchors` / `coachesAnchors`.
- No `is:inline` introductions. No default-export regressions. No `readonly`
  prop regressions. `docs/CONVENTIONS.md` structure remains internally
  consistent (H2 placement between "Internal Routes" and "Data Integrity" is
  reasonable; the section uses the same bullet-plus-rationale shape as its
  neighbors).

## Verdict

**push-ready** — the single Minor finding (JSDoc drift) is a follow-up
candidate, not a push blocker. Owner's call whether to fix on this branch or
register as debt.
