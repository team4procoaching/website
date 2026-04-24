# Review: CTA Copy Review

**Task ID:** 2026-04-24-cta-copy-review **Round:** 3 **Patch Scope:** Round-3
delta since r2 — single commit 11
(`docs(cta): align ARCHITECTURE site-CTAs table with current labels`) closing
the r2 Major. **State:** 6a4afdf239329eeefe9fd011a9f6b51f6584a16a

## Blockers

None.

## Major

None. The r2 Major is closed — see Scope Verification below.

## Minor

None.

## Nit

### `git log (commit 4df9d10) body` — carried-over from r2, intentionally unaddressed

Problem: The r2 Nit (ordinal "commit 8 / commit 9" references in commit 10's
body) remains present on HEAD and is expected to stay per owner direction. No
action required. Recording here only so the r3 trail is explicit: this is a
known, accepted carry-over, not a new finding.

## Not Reviewed

- **TypeScript strictness / Astro idioms / Tailwind v4 / Accessibility /
  Performance** — commit 11 touches a single Markdown table in
  `docs/ARCHITECTURE.md`. Zero runtime surface. No plausible regression vector
  on any of these dimensions.
- **Test coverage** — no new behavior to cover. Existing 244 tests continue to
  pass on HEAD (see below).
- **Round-1/round-2 full code-path re-audit** — out of scope for a closure round
  per Orchestrator instructions. Only the r2 Major closure and no-regression
  checks were in scope.

## Praise

- Commit 11 exceeds the 6-row spec by also correcting the Success Stories Hero
  row (`Start Transformation` → `Start Your Transformation`), a pre-existing
  shortening that never matched the source literal. The body is explicit about
  why the scope expanded ("Also corrects the Success Stories Hero row, which
  carried a pre-existing shortening"). That is the right way to document a
  widened sweep — visible in the commit, not buried in review files.
- Table formatting is re-balanced cleanly: the column-width realignment
  (`Primary CTA` 21 chars, `Secondary CTA` 18 chars) reflects the actual longest
  cells post-rename, rather than carrying stale padding. Pure eyeball-consistent
  docs.

## Scope Verification

- **r2 Major closure — row-by-row against source (`docs/ARCHITECTURE.md:195`,
  `:200`, `:201`, `:204`, `:205`):**
  - Homepage Hero: table now `Work With Us` / `Explore Services` ↔
    `src/pages/index.astro:49-50` renders `Work With Us` / `Explore Services`.
    Match.
  - Coaches Hero secondary: table now `Explore Services` ↔
    `src/pages/coaches/index.astro:43` renders `Explore Services`. Match.
  - Coaches Bottom: table now `Find Your Coach` / `Explore Services` ↔
    `src/pages/coaches/index.astro:111-112` renders `Find Your Coach` /
    `Explore Services`. Match.
  - Success Stories Hero primary: table now `Start Your Transformation` ↔
    `src/pages/success-stories/index.astro:42` renders
    `Start Your Transformation`. Match.
  - Success Stories Bottom primary: table now `Ready to Be Next?` ↔
    `src/pages/success-stories/index.astro:103` renders `Ready to Be Next?`.
    Match.
- **Homepage Bottom row preserved:** `docs/ARCHITECTURE.md:197` still reads
  `Start Your Journey`, matching `src/data/cta.ts:29` — correctly untouched.
- **Single-file scope:** `git show --stat 6a4afdf` shows one file
  (`docs/ARCHITECTURE.md`, +13/-13). No other drift in commit 11.
- **No untouched-row residue:** full re-read of the table lines 193–205 against
  source. All 11 rows line up. No stale cells remain for pages within this
  branch's scope. (`Services Hero`/`Services Bottom` literally match
  `src/pages/services/index.astro:184,221`, which is the parallel-session page —
  correct by coincidence, no branch touch.)
- **Parallel-session exclusions intact:**
  `git log main..HEAD -- src/pages/services/index.astro src/pages/success-stories/\[slug\].astro src/components/sections/coaches/CoachDetailModal.astro`
  returns empty. Zero commits touch these paths on this branch.
- **`CoachDetailModal.astro` untouched:** lines 116 and 242 still carry
  `Start Your Journey`, per the r1/r2 descope decision.
- **Commit-message shape:**
  `docs(cta): align ARCHITECTURE site-CTAs table with current labels` —
  conventional-commits compliant, non-empty scope, factual body naming the four
  rename sources and the Success Stories Hero correction. No session jargon (no
  `r2`, no `.claude/` paths, no SHAs, no ordinals beyond "this branch's page-CTA
  renames" which is branch-state language, not session-state).
- **`pnpm check` on HEAD:** green. `astro check` 0 errors / 0 warnings / 0 hints
  across 120 files; `biome lint` clean; `biome format` clean; `prettier --check`
  clean; `check-conventions.mjs` all passed.
- **`pnpm test:run` on HEAD:** green. 17 test files, 244 tests passed, 3.51s.
- **Branch-diff shape:** `git diff --stat main..HEAD` = 15 files, 265/29. All
  paths are in-scope for this task (touched code files, `docs/ARCHITECTURE.md`,
  `docs/CONVENTIONS.md`, work-dir).

## Verdict

**push-ready** — r2 Major cleanly closed, no regressions, `pnpm check` and
`pnpm test:run` both green on HEAD. Carried-over Nit stays at owner discretion.
