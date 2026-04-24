# Review: CTA Copy Review

**Task ID:** 2026-04-24-cta-copy-review **Round:** 2 **Patch Scope:** Round-2
delta since r1 — commit 8 (JSDoc + ARCHITECTURE Find-Your-Fit alignment), commit
9 (CONVENTIONS example swap), commit 10 (persist r1 report). **State:**
4df9d106697cfdc9d847c7525cecc593d7653940

## Blockers

None.

## Major

### `docs/ARCHITECTURE.md:195,198-205` — Site-CTAs table still stale on six rows changed by this branch's own commits

Problem: Commit 8 reopened the CTA Map table explicitly to align it with the new
labels, but surgically updated only the three `Take the Quiz` → `Find Your Fit`
rows. Six other rows in that same table are now stale because of renames landed
by commits 3–5 _on this branch_:

- Homepage Hero primary: `Start with Team 4 Pro` (commit 3 renamed to
  `Work With Us`)
- Homepage Hero secondary: `Learn about our Services` (commit 3 renamed to
  `Explore Services`)
- Coaches Hero secondary: `View Our Services` (commit 4 renamed to
  `Explore Services`)
- Coaches Bottom primary: `Contact Us` (commit 4 renamed to `Find Your Coach`)
- Coaches Bottom secondary: `View Services` (commit 4 renamed to
  `Explore Services`)
- Success Stories Bottom primary: `Start Transformation` (commit 5 renamed to
  `Ready to Be Next?`)

`docs/ARCHITECTURE.md` opens with "Single source of truth for _what the project
is, how it works, and where it is headed_" and is explicitly cross-referenced by
AI working instructions. A stale CTA Map is exactly the kind of drift the
convention doc + this branch exist to prevent. Calling this Major because the
branch re-entered the table during round-2 fixes and walked away leaving it
lying about labels the same branch just changed — the raw pre-existing drift on
`main` would only be Minor, but re-touching the file without finishing the
alignment turns it into a branch-scoped correctness issue. Recommendation:
Update the six rows above in a follow-up commit on this branch (single hunk, no
runtime impact). The Homepage Bottom row (`Start Your Journey`) correctly stays
since `src/data/cta.ts` still carries that label.

## Minor

None.

## Nit

### `git log (commit 4df9d10) body` — session-ordinal self-reference in commit 10 body

Problem: The body of `docs(work): add review round 1 for CTA copy review` says
"Verdict: push-ready; the one minor finding was addressed in commit 8 and the
one nit in commit 9." Referring to peer commits by ordinal position in a linear
branch is fragile under squash-merge (the ordinals disappear) and falls into the
session-jargon pattern flagged in project feedback. The committed artifact
itself (`04-review-r1.md`) already documents what was closed by which follow-up.
Recommendation: Leave as-is (commits are not amended on this project by default)
or, if re-signing happens for another reason, replace with "addressed in the
follow-up `docs(cta)` and `docs(conventions)` commits on this branch." Pure
polish, no push-blocker.

## Not Reviewed

- **TypeScript strictness** — round-2 delta touches JSDoc `@example` blocks and
  Markdown tables only, no TS surface.
- **Accessibility / Astro idioms / Tailwind v4 / Performance** — no runtime code
  changed in commits 8–10 (verified per-hunk: every commit-8 edit sits strictly
  inside a `@example` block or a Markdown table row; commit 9 is a single string
  swap inside a prose bullet; commit 10 is a new `.md` file).
- **`pnpm check` / `pnpm test:run` green on HEAD** — cannot execute in reviewer
  mode (read-only bash). r1 noted both green at `4b5516f`; delta since then is
  pure documentation text, so a regression in typecheck or tests from commits
  8–10 is implausible. Implementer should re-confirm on the push-ready HEAD
  before the owner pushes.
- **Round-1 spec-in-scope spot-check** — confirmed still-clean via delta read
  only (no touches to `src/pages/services/index.astro`,
  `src/pages/success-stories/[slug].astro`, or
  `src/components/sections/coaches/CoachDetailModal.astro` since r1; verified
  via `git log main..HEAD -- <file>`).

## Praise

- R1 Minor closure is exact: all six `@example` blocks listed in r1
  (`Button.astro:22`, `CTA.astro:29`, `CtaButton.astro:15`, `Services.astro:21`,
  `QuizModal.astro:22`, `components.ts:117`) now read `"Find Your Fit"`. Each
  edit is strictly inside an `@example` fence — zero runtime code touched. No
  paraphrase, no drift in quote style or surrounding formatting.
- R1 Nit closure is exact and narrow: `docs/CONVENTIONS.md:189` swapped
  `"Start Your Journey"` → `"Work With Us"`; single-line diff in commit 9. All
  other `"Start Your Journey"` occurrences are intentionally preserved
  (`src/data/cta.ts` Homepage Final CTA, `CoachDetailModal.astro`
  descope-scoped, r1/changeset docs, ARCHITECTURE Homepage Bottom row).
- Implementer surfaced and fixed the three stale ARCHITECTURE rows that r1
  missed on the Find-Your-Fit rename. That bar-raising belongs in Praise even
  though six further rows remain stale (see Major above) — the instinct to
  extend the JSDoc sweep into ARCHITECTURE.md was correct, just not carried far
  enough.
- Commit-msg discipline on commit 8's initial scope-empty hook-fail: re-sign as
  a fresh commit (not amend) is the right pattern per project convention.

## Scope Verification

- **Residual-label sweep:** zero hits for `Take the Quiz` / `Take Quiz` in
  `src/`; `docs/` hits are exclusively inside the task work-dir
  (`00-changeset.md`, `04-review-r1.md`) as the spec prescribes. Confirmed via
  repo-wide grep.
- **Parallel-session exclusions still honored:** `git log main..HEAD` shows zero
  touches to `src/pages/services/index.astro` or
  `src/pages/success-stories/[slug].astro` since r1.
- **`CoachDetailModal.astro` still untouched since r1:** descope intact (lines
  116 and 242 still carry `Start Your Journey`).
- **Commit 10 r1-report byte-identity:** `git diff 4df9d10 --` against the
  on-disk `04-review-r1.md` is empty; 103 lines both sides. No silent edits.
- **Commit-message shape for 8/9/10:** all three use `type(scope): subject` with
  non-empty scope (`docs(cta)`, `docs(conventions)`, `docs(work)`). Bodies are
  factual. Only the commit-10 body has the ordinal-reference Nit above.
- **Commit 8 narrative-prose check:** the ARCHITECTURE.md hunk is contained in
  the `CTA Map` table rows only — introduction paragraph at line 190 and
  neighboring sections (`Key Data Flows` at line 209, `Project Structure` at
  line 47) are untouched. Confirmed by
  `git show 8f3d320 -- docs/ARCHITECTURE.md`.
- **Commit 9 collateral check:** single-line diff in `docs/CONVENTIONS.md` on
  line 189; no other edits in that commit.
- **No hardcoded paths introduced by commits 8–10:** the `href: "/quiz"` in
  `Services.astro:21` JSDoc is pre-existing (predates this branch) and lives
  inside illustrative `@example` pseudo-code. Not a commit-8 regression.

## Verdict

**fix-before-push** — one Major (ARCHITECTURE.md Site-CTAs table stale on six
branch-renamed rows) needs closure before push. A single-commit follow-up
aligning those rows completes what commit 8 started and keeps the
"single-source-of-truth" promise honest. The Nit is at owner discretion.
