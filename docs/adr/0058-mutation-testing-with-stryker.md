# Mutation Testing with Stryker (on-demand, positive list)

Date: 2026-05-25

## ADR Warrant Check

- [x] **A — Contract**: this ADR creates a project-wide contract for what gets
      mutated, by which tool, with which exit-code reading, and by which
      maintenance discipline. The `mutate` positive list in `stryker.config.mjs`
      is a contract over which files in `src/data/` count as "logic carrying
      enough behaviour to deserve a mutation-score reading". Future contributors
      adding a logic-bearing file under `src/data/` must update the positive
      list (the inclusion criterion lives in CONVENTIONS.md). The on-demand,
      diagnostic-not-gate stance (`break: null`, no CI, no hook) is the second
      half of the same contract — without it the cost surface (3 min/run on a
      handover-bound solo project) would land in the wrong place.
- [x] **B — Asymmetry**: the decision establishes a deliberate asymmetry between
      two superficially-similar tools — Vitest (continuous, blocking, every code
      change) and Stryker (on-demand, advisory, only when behaviour changed in a
      listed file). A future tidy-pass would naturally collapse both into one
      quality chain ("if it earns its place, run it in CI"; "if it doesn't, drop
      it"). The asymmetry must survive that tidy: Stryker is neither a gate nor
      abandonment-bait, it is a diagnostic the maintainer reaches for at a
      defined cadence. The CONVENTIONS section that carries the asymmetry sits
      next to Testing Conventions but does not fold into it, precisely so the
      reader is forced to read the on-demand framing before reaching for the
      tool.
- [ ] **C — External revisit**: not invoked. The scope can grow naturally (a new
      logic file in `src/data/` lands on the positive list under the inclusion
      criterion); the tool itself has no scheduled vendor migration and no
      external-event-driven revisit.
- [ ] **D — Promise/Code Asymmetry**: not invoked.

## Status

Accepted

**Amendment (2026-05-29).** The deferred test-gap follow-up named in § Why two
files, not five has landed: `coaches.ts` joined the `mutate` positive list
alongside the tests that kill its mutants, exactly as the deferral planned. The
positive list is now three files — `services.ts`, `successStories.ts`, and
`coaches.ts`. The two-file framing in the Decision, rationale, and
Success-criteria sections below — including the `Found 2 of M file(s)`
Stryker-log line — is preserved as the record of this ADR's merge-time state.

## Context

Coverage measures _which lines run_, not _what regressions a test suite
catches_. The logic under `src/data/` encodes business rules — detail-page
gating in `hasCompleteDetailContent`, related-stories bucketing in
`relatedStoriesFor`, quiz resolution in `quiz.ts`'s consumer (`quizContext`),
the coaching-years aggregation `getTotalExperience` — whose silent regression
line coverage cannot catch. Mutation testing fills that gap by perturbing the
production source (flipping `>=` to `>`, removing `.sort(...)`, replacing
arithmetic operators) and asking whether any test fails on the perturbation. A
surviving mutant either names a real test gap or an equivalence the tool cannot
resolve.

Three local Stryker runs established the empirical picture restated here. The
first run mutated co-located test files (~75% of mutants, ~94% of survivors
lived in `*.test.ts`); the score (35.38%) was meaningless. Excluding test files
lifted the picture (total 51.30%, covered 76.70%) but left 51 `NoCoverage`
mutants in pure content/data modules (SVG paths, marketing strings). Excluding
content modules brought total and covered into agreement at **76.70%** with
**zero `NoCoverage` mutants** — the score now measures only code that tests
actually exercise. The covered number is the maintainable signal; chasing total
when total includes unmutate-worthy content is busy-work, not quality.

The cost shape matters for the on-demand-vs-gate question. A Stryker run on the
in-scope surface takes roughly three minutes. On a handover-bound,
solo-maintained project where most future work is AI-generated, a three-minute
blocking step on every push (or every `pnpm check`) would either be routinely
bypassed (`--no-verify` becomes habit, see ADR-0056 for the prior precedent on
advisory demotion) or it would slow the AI iteration cycle to the point where
contributors stop running the suite locally. Both failure modes leave the tool
in a worse state than absence: present, ignored, drift surface on every config
file.

The decision this ADR closes: **how does mutation testing live in this
repository without becoming a gate that is either bypassed or slows iteration to
a halt, and without becoming a one-off author-local experiment that dies with
the author?**

### Decision drivers

- **Diagnostic, not pass/fail.** Mutation score is a number the maintainer reads
  and triages, not a threshold the CI enforces. ADR-0056 already established the
  project's appetite for advisory signals over blocking gates on tools whose
  blocking value cannot be defended; Stryker fits the same posture by
  construction (the score has no honest "this is the threshold" answer on a
  7-file logic surface).
- **Positive list over negative list.** The dominant AI-failure-mode in this
  codebase is "AI adds a new content-only file under `src/data/`". Under a
  negative-list shape, that file silently enters the mutate scope and
  reintroduces the content-survivor noise that the original handoff's three
  iterations took to escape. Under a positive list, the same file is a clean
  no-op; the rarer "AI adds a logic file" case surfaces during Phase-2 concept
  review (the CONVENTIONS inclusion criterion is the architect's checklist),
  where the architect adds the file to the list at the same step as the new file
  lands. The asymmetry reflects the AI-iteration cost shape: silent miss on a
  rare logic file is recoverable; silent score pollution on every new content
  file is not.
- **Explicit over implicit shape.** The project posture is explicit-over-
  implicit at every level — `as const satisfies Record<>` (ADR-0017),
  `check-*`/`generate-*`/`query-*` script prefixes (ADR-0050), the explicit
  `ids.ts` module. A `mutate` array of literal file paths matches that posture;
  a glob-with-exclusions does not. The Stryker docs default
  (`{src,lib}/**/!(*.+(s|S)pec|*.+(t|T)est).+(cjs|mjs|js|ts|...)` plus a
  `!{src,lib}/**/__tests__/**` exclusion) is the docs-idiomatic shape but is
  optimised for a generic project where "everything that compiles is logic";
  this repo does not match that assumption (most of `src/data/` is typed
  content, not behaviour).
- **AI-first working mode.** This project is maintained solo and most future
  work is AI-generated. A maintenance discipline expressed as a Phase-2
  architect-surface touch (read CONVENTIONS, classify the new file, update the
  list) is more durable in this mode than a sensor script that warns when a
  heuristic detects logic outside the list. The sensor would either flag
  content-shaped logic and create noise, or miss logic-shaped content and create
  false confidence; the architect's classification step has full context that no
  AST heuristic carries.
- **TypeScript-checker keeps the score honest.** Stryker's typescript-checker
  plugin drops compile-error mutants from the score, so the percentage reflects
  mutants the type system could not catch — i.e., the ones tests must catch.
  Without the checker, the score would be diluted by mutants that ship without
  compiling, which is not the regression class tests exist to catch.

### Evaluated approaches

1. **Status quo plus folk discipline.** Keep Stryker as an author-local
   experiment (no commit, no script, no docs). Rejected: the handoff captured
   the lessons exactly because the experiment is repeated-by-hand only as long
   as the author remembers and stays. The artefacts have to land in the repo to
   survive author rotation.
2. **Negative list (`src/data/**/\*.ts` minus exclusions outside the data
   surface).\*\* Rejected on the AI-failure-mode argument above. The exclusion
   list grows on every content addition; a forgotten exclusion manifests as a
   noisy score on the next run, not as a missed gap; on a solo project the noise
   is the more frequent and more corrosive failure.
3. **Positive list with glob-and-exclusions inside the data surface**
   (`src/data/**/*.ts` plus per-content-file `!`-negations). Rejected: same
   failure shape as approach 2 at smaller scope (every new content file under
   `src/data/` still requires an exclusion); the glob form is shorter to type
   today but adds an asymmetric maintenance discipline (exclusion on add; never
   on remove) that the explicit-enumeration form does not.
4. **Positive list with explicit file enumeration.** **Chosen.** Two files today
   (see Decision below), inclusion criterion in CONVENTIONS, list maintained at
   Phase-2 architect cadence. Maintenance cost is paid only when a genuinely-new
   logic file lands under `src/data/`, which the architect catches by reading
   CONVENTIONS during the concept phase.
5. **Pre-push or CI gate with a numeric threshold.** Rejected. The three-minute
   run time would either land as a blocking step contributors route around
   (ADR-0056's prior precedent), or as a non-blocking CI step whose output
   nobody reads because no PR depends on it. The on-demand reading is the
   structurally honest form for this cost shape and this maintenance model.

## Decision

Stryker is introduced as an on-demand mutation-testing tool with these shape
choices:

1. **Tool packages, exact-pinned in `devDependencies`.** Three packages,
   matching the project's exact-version pin convention for devDependencies
   (e.g., `vitest: 4.1.1`):
   - `@stryker-mutator/core@9.6.1` — the runner. The 9.6.1 version is the one
     the original handoff tested across three documented runs; Renovate
     maintains it from this baseline.
   - `@stryker-mutator/vitest-runner@9.6.1` — the test runner that reuses the
     project's existing Vitest config (no parallel test harness).
   - `@stryker-mutator/typescript-checker@9.6.1` — drops compile-error mutants
     from the score so the percentage reflects mutants the type system could not
     catch.

   If a future Phase-2 concept surfaces a need for a fourth `@stryker-mutator/*`
   package (e.g., a custom reporter), it lands as an explicit concept-doc open
   question, not silently.

2. **`pnpm test:mutation` script.** A `"test:mutation": "stryker run"` entry
   joins the existing `test`, `test:run` pnpm-script family. The script is never
   chained into `pnpm check`, never invoked by any Husky hook, never referenced
   from any `.github/workflows/*.yml`. Run manually before merging a logic
   change in a positive-listed file.

3. **`stryker.config.mjs` at the repo root.** Carries the `mutate` array as the
   positive list:

   ```js
   mutate: ['src/data/services.ts', 'src/data/successStories.ts'],
   ```

   plus `break: null` (no numeric threshold), `checkers: ['typescript']`
   referencing `tsconfig.stryker.json`, `testRunner: 'vitest'`, and the
   `reports/mutation/` HTML reporter directory. The misleading
   `incremental: false` comment from the author-local config is corrected.

4. **`tsconfig.stryker.json` at the repo root.** Extends `tsconfig.json` with
   the includes the typescript-checker needs to validate mutated files against
   the project's strict-mode TypeScript surface.

5. **`reports/mutation/` is gitignored.** The HTML report is a reproducible
   artefact, not a versioned deliverable.

6. **Inclusion criterion lives in `docs/CONVENTIONS.md` § Mutation Testing.** A
   new top-level section carries the inclusion rubric (behaviour-vs-content
   bug-rule), the surgical-disable guidance for single content lines in
   otherwise logic-heavy files (`// Stryker disable next-line StringLiteral`),
   and the "reading findings" sub-section (the **covered** score is the
   maintainable number, not **total**). The Topic Hub Index gains an entry "When
   changing logic in a positive-listed `src/data/` file" pointing at the new
   section.

### Why two files, not five

The original handoff enumerated five candidate files (`services.ts`,
`successStories.ts`, `quiz.ts`, `coaches.ts`, `stats.ts`). The Phase-1
refactor-scan and a per-file logic-vs-content audit narrow the actually-
mutate-worthy set to two:

- `services.ts` (1138 lines): five logic functions (`isDurationMinutes`,
  `isPackageSize`, `getServicesByCategory`, `serviceDetailHref`,
  `hasCompleteDetailContent`) inside a large catalog. Real behaviour, real test
  gaps surfaced by prior Stryker runs.
- `successStories.ts` (505 lines): three logic functions
  (`successStoryDetailHref`, `hasDetailPage`, `relatedStoriesFor`) inside a
  408-entry catalog. Real behaviour, including the bucket-sort-order in
  `relatedStoriesFor` that prior Stryker runs flagged.
- `quiz.ts` (329 lines): essentially pure typed-data; the logic the original
  handoff cited lives in `~/utils/quizContext` and `quizModalController`, not in
  `quiz.ts` itself. Including it would produce a content-survivor noise surface
  (per-step labels, option strings) that the surgical-disable remedy can manage,
  but the maintenance-versus-payoff ratio is the same on a content file with one
  derived-value line: the cost is real, the marginal score signal is near-zero.
- `coaches.ts` (219 lines): two logic functions (`getCoachById`,
  `getTotalExperience` aggregating `coachingYears`/`competitionYears`). The
  aggregation is real logic worth mutating, but it is included in the
  separately-deferred test-gap follow-up; without those tests in place the
  positive-list inclusion would surface survivors with no test to kill them.
  Deferred to that follow-up by symmetry — the file goes on the list in the same
  stream that adds its tests.
- `stats.ts` (107 lines): pure typed data plus a single module-load expression
  `getTotalExperience()` that delegates into `coaches.ts`. No own logic worth
  mutating; the case for including it does not survive the inclusion rubric.

`quiz.ts`, `coaches.ts`, and `stats.ts` therefore stay off the initial list.
Each one's inclusion is one CONVENTIONS-criterion check away when a
genuinely-mutate-worthy function lands in it (or when the deferred test-gap
follow-up bundles `coaches.ts` with its tests). The cost of adding a file later
is one line in `stryker.config.mjs`; the cost of having to argue why a content
file is in the list is a per-run content-survivor triage.

### What does NOT change

- **No CI integration.** No GitHub Actions job, no Netlify build step, no
  required check on PRs. The non-scope boundary held by the original handoff is
  preserved.
- **No pre-commit or pre-push hook.** ADR-0056 demoted the existing duplication
  hook to advisory because a routinely-bypassed gate carries no signal; Stryker
  does not enter that hook layer at all.
- **`break: null` stays.** No numeric mutation-score threshold is introduced.
  The score is read, not enforced.
- **Vitest, coverage reporting, and the existing test infrastructure**
  (CONVENTIONS § Testing Conventions, ADR-0016, ADR-0037, ADR-0052) are
  unchanged. Mutation testing supplements them; it does not replace any layer.
- **No scope beyond `src/data/`.** `src/utils/`, `src/scripts/`,
  `scripts/**/*.mjs` are not included. Expansion can be a future stream once the
  practical value at this scope is observed.

## Consequences

### Positive

- **A maintainable quality signal for the data-layer logic.** The covered
  mutation score on `services.ts` and `successStories.ts` is a number the
  maintainer reads before merging a logic change in either file; survivors
  surface as triage candidates (real gap → test; equivalent → surgical disable
  with rationale).
- **Predictable scope.** A new content-only file under `src/data/` is a no-op
  for Stryker by construction. The score is not perturbed by unrelated content
  additions; trend-comparison across PRs stays honest.
- **No new sensor, no new hook.** The maintenance burden is one line in
  `stryker.config.mjs` when a new logic file lands, surfaced at architect
  Phase-2 cadence by the CONVENTIONS inclusion criterion. The convention is
  review-enforced, the same enforcement mode ADR-0050 uses for the script-naming
  taxonomy.
- **Score honesty via typescript-checker.** The 76.70% covered number from the
  handoff's third run is the kind of number the maintainer can act on precisely
  because compile-error mutants are dropped from it; the same contract holds
  after this ADR lands.

### Negative

- **Manual discipline required.** A maintainer (or AI agent) must remember to
  run `pnpm test:mutation` before merging a logic change in a positive-listed
  file. The CONVENTIONS section and the Topic Hub Index entry are the
  discoverability surfaces; the architect Phase-2 step is the enforcement
  surface. Neither is a sensor.
- **Positive list maintenance.** A genuinely-new logic file under `src/data/`
  does not auto-enter the score. If the architect misses the inclusion criterion
  during Phase 2, the file's behaviour is unmutated until a future stream
  catches it. Mitigation: the CONVENTIONS section and Topic Hub Index entry; the
  inclusion rubric is short and reproducible.
- **Three-minute run time.** Acceptable as on-demand; would be unacceptable as a
  gate. The on-demand framing is load-bearing.
- **Renovate noise on three packages.** Renovate maintains
  `@stryker-mutator/{core,vitest-runner,typescript-checker}` jointly going
  forward; a Stryker minor that lands in only one package would surface as a
  partial-bump PR. Acceptable: the same shape exists today for `@biomejs/biome`
  and `@commitlint/{cli,config-conventional}`.

### Risk mitigation

- **Score-drift goes unnoticed.** If `pnpm test:mutation` is not run for months,
  score-regression goes invisible until the next manual run. Mitigation: the
  architect Phase-2 step on a logic-change concept is the formal trigger; the
  maintainer also runs the suite opportunistically during cleanup streams. A
  future escalation path — if score-drift becomes a recurring concern — is a
  nightly GHA job or a `gh workflow run` on-demand pattern; both are deferred
  until the on-demand discipline is observed to fail.
- **Positive-list staleness on a file rename or split.** A `git mv` on a
  positive-listed file silently breaks the list (Stryker would skip the renamed
  path or fail at startup). Mitigation: the architect Phase-2 step on any
  structural change to a listed file checks the list; the startup-failure mode
  is loud (Stryker exits with a clear "no files found" error), which makes it
  self-correcting on the next run.

## Success criteria

- After this ADR's PR merges, `pnpm test:mutation` runs to completion against
  the two positive-listed files (`services.ts`, `successStories.ts`). The
  Stryker log shows `Found 2 of M file(s) to be mutated`.
- The covered mutation score has zero `NoCoverage` mutants. If a `NoCoverage`
  mutant surfaces, it is traceable to a deliberately-included logic line whose
  content survivor should be surgically disabled rather than reshape the list.
- `git status` after a run shows no committed report artefacts (the HTML report
  writes into the gitignored `reports/mutation/`).
- A future maintainer reading `docs/CONVENTIONS.md` § Mutation Testing and the
  Topic Hub Index can determine whether a new `src/data/` file belongs on the
  positive list without reading this ADR or the original handoff.

## Documentation Updates

This ADR requires updates to the following documents in the same PR that
introduces it. The architect lists them here; the implementer makes the updates
as part of the commit plan.

**Updates required by this ADR:**

- [`docs/CONVENTIONS.md`](../CONVENTIONS.md) — new top-level section **"Mutation
  Testing (Stryker)"** carrying the inclusion criterion, the surgical-disable
  guidance, and the "reading findings" sub-section. Top- level placement (not a
  sub-section of Testing Conventions) follows the precedent of
  `## Component Tests with Astro Container API` — a testing-adjacent rule that
  earns its own peer section because the on-demand framing is load-bearing and
  must not be skimmed past as a testing-conventions sub-detail.
- [`docs/CONVENTIONS.md#topic-hub-index`](../CONVENTIONS.md#topic-hub-index) —
  new bullet **"When changing logic in a positive-listed `src/data/` file"**
  pointing at the new section and at this ADR.
- [`docs/ARCHITECTURE.md#code-quality`](../ARCHITECTURE.md#code-quality) — new
  Stryker row in the Code Quality table, mirroring the jscpd row's
  `[ADR-XXXX](...)` link style (cell points at `stryker.config.mjs`, CONVENTIONS
  § Mutation Testing, and this ADR).
- [`docs/ARCHITECTURE.md#project-structure`](../ARCHITECTURE.md#project-structure)
  — two new lines in the project tree at the repo-root level alongside
  `vitest.config.ts` and `tsconfig.json`: `stryker.config.mjs` and
  `tsconfig.stryker.json`.
- [`docs/ARCHITECTURE.md#adr-quick-reference`](../ARCHITECTURE.md#adr-quick-reference)
  — new row for this ADR.
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) § Where to Find Coding Rules —
  new bullet mirroring the new Topic Hub Index entry.
- [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md) § Available Scripts → Testing — new
  `test:mutation` row. A follow-up paragraph after the table points at
  CONVENTIONS § Mutation Testing and this ADR, parallel to the existing Vitest
  paragraph that points at ADR-0016.
- [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md) § Code Quality Tools → Tool Matrix
  — new Stryker row.
- `.gitignore` — `reports/mutation/` entry, grouped with the existing agent-side
  cache entries.
- `package.json` — three pinned `@stryker-mutator/*` devDependencies and the
  `test:mutation` script.
- `.claude/settings.json` — `WebFetch(domain:stryker-mutator.io)` permission
  entry so future research against the Stryker docs is permission-allowed.

**Checked and deliberately not updated:**

- `CLAUDE.md` § Conventions Quick Reference — Stryker does not change a hard
  rule or a coding convention every contributor must apply on every edit. The
  Topic Hub Index entry plus the CONVENTIONS section are the on-demand
  discoverability surface; CLAUDE.md's Quick Reference is for always-on rules. A
  future Quick Reference entry can be added if practical experience surfaces a
  regularly-missed application.
- `docs/MAINTENANCE.md` — no hook or CI integration, so no maintenance surface
  to document. The Pre-Push Gate is unaffected (Stryker is not in the gate at
  all).
- ADR-0016 (archived) — unchanged. Stryker is a separate diagnostic on top of
  Vitest, not a successor or amendment to the unit-test runner decision. No
  `Amends` or `Supersedes` relationship.

## References

- [ADR-0017](0017-domain-data-integrity-pattern.md) — the
  `as const satisfies Record<>` pattern. The same explicit-over-implicit posture
  motivates the positive-list-with-explicit-enumeration shape over the
  glob-with-exclusions alternative.
- [ADR-0050](0050-script-entry-point-naming-convention.md) — establishes that
  review-time architect-Phase-2 classification is a durable enforcement mode for
  conventions whose surface is small enough that a sensor would not earn its
  build. The positive-list maintenance discipline inherits the same enforcement
  mode.
- [ADR-0056](0056-duplication-gate-as-advisory-signal.md) — the prior precedent
  for accepting advisory-over-blocking on a tool whose blocking value cannot be
  defended. The on-demand framing here is the next point on the same axis
  (advisory inside a hook → advisory outside any hook).
- [ADR-0051](0051-session-service-detail-page-launch-gate.md) — defines the
  `hasCompleteDetailContent` predicate whose session-arm coverage gaps this
  stream bundles closing tests for. The bundled tests are not part of the ADR's
  contract; they are part of the same PR because the architect judged the
  additions small enough to land alongside Stryker without ballooning the change
  surface.
- `docs/CONVENTIONS.md` § Mutation Testing (Stryker) — the convention entry that
  carries this ADR's operational substance. Added in the same PR.
