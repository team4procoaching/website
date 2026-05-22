# Performance and Quality Gates with Lighthouse CI

Date: 2026-05-19 (revised 2026-05-22 — Phase-4 CI-revealed-defect correction)

## ADR Warrant Check

- [x] **A — Contract:** The explicit assertions defined below become CI gates. A
      regression below an ERROR-mode threshold blocks an audited PR; a
      regression below a WARN-mode threshold surfaces in the job-summary table
      and the step log but does not block. The assertion thresholds, the WARN
      vs. ERROR assignment, the WARN→ERROR transition window (4 weeks of clean
      nightly runs on `main`), and the monitor→required transition (3
      consecutive clean nightly runs) are the contract. Any change requires
      explicit owner sign-off and an update to this ADR's Status.
- [x] **B — Asymmetry:** Mobile and Desktop budgets are deliberately different
      and tracked separately. A future "harmonising" PR that collapses them to a
      single set would be a regression — mobile is throttled (Slow-4G + 4× CPU)
      and operates against a stricter LCP / FCP / Performance-score floor than
      desktop, while desktop FCP / LCP run an order of magnitude faster and
      carry correspondingly tighter ERROR floors. The asymmetry is the design
      intent, and the two form factors live in two separate config files (see §
      Configuration). The asymmetry now also extends to the **run profile**: PR
      runs are Mobile-only at `numberOfRuns: 1`, nightly runs are both form
      factors at `numberOfRuns: 3` — see § Workflow shape.
- [ ] **C — External revisit:** Not invoked today. Revisit triggers surface
      naturally if (a) the site migrates off Astro SSG (ADR-0022 change), (b)
      Stripe-backed dynamic routes ship and the per-route budget diverges, or
      (c) a real-user-monitoring source for INP becomes available.

## Status

Accepted (Phase-4 corrected 2026-05-22 — assertion strategy, trigger scope, run
cost; see § Revision history).

## Revision history

- **2026-05-19** — original Accepted.
- **2026-05-21** — Phase-3 touch-ups (three-file config shape; CWV ERROR-only)
  and a Phase-4 PR-comment-claim correction (the gate produces no PR comment).
- **2026-05-22 — Phase-4 CI-revealed-defect correction.** The first real CI run
  revealed a structural defect: the configs asserted with
  `preset: 'lighthouse:no-pwa'`, which silently asserts ~50 individual
  Lighthouse audits on top of the 12 baseline-defended budgets. Only the 12 were
  ever baselined; the ~50 fail on the pre-existing `main`. **The gate is
  corrected to explicit-only** — the `preset` key is removed; the gate is
  exactly the named assertions. The PR-trigger audit is **path-gated** (the
  audit job is skipped on docs-only PRs) and `push: main` is dropped. The PR run
  profile is reduced to 1-run Mobile-only; nightly stays 3-run both form
  factors. The "baseline-defended budgets" framing is corrected throughout to
  name precisely the assertions that are the gate.
- **2026-05-22 — concept-review-r4 rework.** The first Phase-4 revision proposed
  a second workflow file (`lighthouse-gate.yml`) as a status-shim; the
  concept-reviewer established that a separate workflow cannot mechanically
  mirror a sibling workflow's conclusion within `contents: read` scope. The
  status-shim is **withdrawn as a separate file**: the required-check trap is
  resolved **inside the single `lighthouse.yml`** by moving the path filter off
  the `on:` trigger and onto a `changes` pre-job whose output gates the audit
  job, so the always-running `lighthouse-status` job reports the
  `Lighthouse Status` check on every PR. The `paths:` perf-relevant list gains
  `.nvmrc` and `tsconfig.json` (exact-path build inputs); `netlify.toml` is
  deliberately excluded. The Desktop `cumulative-layout-shift` assertion is
  **deferred** (dropped at day one, re-added at the 0.1 floor after the
  desktop-CLS follow-up) rather than re-floored to a loose 0.40 — consistent
  with how explicit-only treats the other pre-existing defects.
- **2026-05-22 — concept-review-r5 rework.** The r5 pass confirmed the r4 rework
  but found the new `lighthouse-status` mechanism under-specified. Three
  corrections, all in § Workflow shape: (1) the `lighthouse-status` job's GREEN
  condition now carries a **full outcome contract** — the legitimate-skip GREEN
  branch additionally requires `needs.changes.result == 'success'`, so a failure
  of the `changes` pre-job itself lands RED, not silent-green; the exact GitHub
  Actions expressions are stated. (2) The `dorny/paths-filter` mode is pinned:
  the **`git`-diff mode**, paired with an `actions/checkout` at `fetch-depth: 0`
  in the `changes` job — the mode that keeps the `changes` job at
  `contents: read` only (the API list-files mode would need
  `pull-requests: read`). (3) The **OQ2 path-list contract** is named:
  `package.json` and `pnpm-lock.yaml` are load-bearing for OQ2 (every bot PR
  audited) and may not be removed from the perf-relevant list without re-opening
  OQ2.

## Context

The site is full SSG via Astro on Netlify, optimised for mobile traffic (three
IFBB Pro coaches' marketing site). Performance, page-level accessibility, best
practices, and SEO are managed today by manual audits and developer discipline.
There is no automated gate against regressions — an image swap that doubles LCP,
a font addition that pushes total transferred bytes above the threshold a
marketing site can sustain, or a stray inline `<script>` that breaks an SEO
audit currently lands silently.

The pre-push gate (`pnpm format`, `pnpm check`, reviewer agent) operates on
source code. The existing CI lanes (`quality.yml`, `tests.yml`, `semgrep.yml`,
`links.yml`, `csp-drift.yml`) all operate on source or on the link surface of
the built HTML. None of them measures the built artefact under realistic
mobile-throttled lab conditions.

Component-level accessibility (ADR-0052) catches axe-detectable violations per
component at unit-test time, with no category-score averaging — a single
`color-contrast` violation fails the per-component axe assertion outright.
Lighthouse runs page-level accessibility, performance, best practices, and SEO
against the **produced HTML, CSS, JS, and images** as a browser sees them. The
two layers are deliberately separate and complementary: ADR-0052's axe layer is
the **per-audit** a11y gate; this ADR's Lighthouse `categories:accessibility`
assertion is the **page-composition aggregate** gate. axe-in-jsdom evaluates an
unmounted DOM fragment; Lighthouse-in-Chrome evaluates the full rendered page
including paint events, network sequencing, and layout stability.

### Decision drivers

- **Mobile-first audience.** Budgets are derived for mobile-throttled lab
  conditions; desktop is tracked separately at its own floors. PR runs are
  Mobile-only for the same reason.
- **Marketing site, revenue relevance.** Performance and SEO regressions
  translate to lost leads. The cost of "we'll catch it manually" is real.
- **Solo maintainer.** Budgets must be defensible in the absence of team
  consensus; every threshold has an explicit rationale grounded in the baseline
  measurement, not an aspiration.
- **AI-first working mode.** The project optimises for typed boundaries, low
  blast radius, and structural enforcement over per-contributor discipline. A CI
  gate is structural; "remember to run Lighthouse" is discipline. This driver is
  also why the gate is **explicit-only** rather than preset-based: a gate whose
  correctness depends on a maintainer noticing every new Lighthouse audit and
  silencing it is discipline, not structure.
- **CI laneing.** Lighthouse runs a full Astro build plus Lighthouse audit
  passes. It must not slow the fast `quality.yml` and `tests.yml` lanes, and PR
  feedback must be well under ~13 minutes.
- **No paid SaaS.** Per the Cost-Conscious Operational Principle. No self-hosted
  LHCI server; `temporary-public-storage` report URLs surfaced in the step log
  are the trend mechanism.

### Evaluated approaches

1. **`@lhci/cli` in dedicated `.github/workflows/lighthouse.yml`,
   `staticDistDir` against `dist/`, separate Mobile and Desktop runs.**
   **Chosen.** Builds the site, serves `dist/` with LHCI's built-in static
   server, runs Lighthouse against the budgets defined below. Reports via the PR
   status check (pass/fail), a job-summary table in the GitHub Actions run, and
   `temporary-public-storage` report URLs printed to the step log. The version
   surface is auditable in `package.json` + `pnpm-lock.yaml` (Renovate-visible,
   Socket.dev-gated).
2. **`@lhci/cli` inside the existing `quality.yml`.** Rejected on workflow-shape
   grounds. `quality.yml` is the fast source-level lane (~30s with cache); LHCI
   is the slow build-output lane. Mixing the two either slows down the fast lane
   or forces conditional skips that re-open the silent-drift surface the gate is
   meant to close. The per-job permission profile also differs.
3. **No automated audit; rely on manual Lighthouse runs.** Rejected. Manual
   audits drift; the project has no automated audit of the built artefact today
   and would not reliably run one going forward.
4. **Lighthouse against Netlify deploy-preview URLs.** Considered. Tests the
   actual CDN, but couples CI timing to deploy-preview completion and tests a
   non-deterministic surface (CDN cache state, edge response timing). The
   static-server approach is deterministic and runs in-band.
5. **`lighthouse-ci-action` (treosh) wrapping `@lhci/cli`.** Considered. The
   action wraps the same `@lhci/cli` with a thinner GitHub-Actions surface but
   moves the version pin from `package.json` to a GitHub Actions SHA. The
   `pnpm exec lhci autorun` path keeps the version surface auditable alongside
   every other devDependency.

A PR-comment reporting surface (an `actions/github-script` step upserting a
comment with the report links) was considered and is **out of scope**: the gate
already surfaces its result in the PR status check, the job-summary table, and
the step log, and the owner chose not to add a comment step.

### The assertion-strategy decision (Phase-4)

The first real CI run revealed that `preset: 'lighthouse:no-pwa'` — used as the
assertion base in all three config files — asserts essentially every individual
Lighthouse audit (dozens, mostly `error`-level). The explicit `assertions:`
block overrode only 12 of them. The other ~50 were never baseline-defended and
fail on the pre-existing `main` (the RED run is the proof). Two strategies were
weighed:

- **Drop the preset, assert explicit-only (chosen).** The gate becomes exactly
  the explicitly authored, baseline-defended assertions. No real signal is lost:
  a Lighthouse **category score** is a weighted aggregate of its member audits,
  so a regression in any individual audit still trips the `categories:*`
  assertion. A `@lhci/cli`/`lighthouse` minor bump that _adds_ an audit cannot
  break the gate — an unnamed audit ID is simply not asserted.
- **Keep the preset, set every non-baselined audit to `off` (rejected).** A long
  hand-maintained `'off'` block. Rejected: it must be kept exhaustive across
  every Lighthouse version (a new audit re-arms the gate the next day), it
  buries the real assertions in ~50 `'off'` lines, and once the
  pre-existing-defect audits are switched off it has the _same_ effective gate
  as explicit-only — strictly dominated.

The decisive property is **version-stability**: explicit-only makes the gate a
closed, reviewed set of named audit IDs that a Lighthouse upgrade cannot
silently expand. For an AI-first, solo-maintainer project that optimises for
structural enforcement over per-contributor discipline, a gate whose correctness
depends on perfect upgrade vigilance is the wrong design.

The explicit-only behaviour is verified at the source level against the pinned
`@lhci/cli@0.15.1`. Two guards confirm it:

- **`@lhci/cli/src/assert/assert.js` line 54** — `runCommand` computes
  `const areAssertionsSet = Boolean(assertions || assertMatrix || preset);` and
  the next line throws `'No assertions to use'` **only** if that is false and
  there is no `budgetsFile`. With an explicit `assertions` object present,
  `areAssertionsSet` is true, so `lhci assert` runs normally **with no preset**.
  This is the load-bearing entry-point guard.
- **`@lhci/utils/src/assertions.js` `resolveAssertionOptionsAndLhrs`** —
  `preset` defaults to the empty string; the preset data is merged in **only**
  when `preset.match(/lighthouse:(.*)$/)` is truthy. With no `preset` key the
  merge is skipped and `auditsToAssert` is built from `Object.keys(assertions)`
  — exactly the audit IDs the config names, nothing else.

## Decision

Adopt `@lhci/cli` (pinned at exact `0.15.1` as a devDependency in
`package.json`) in a **single** dedicated GitHub Actions workflow
`.github/workflows/lighthouse.yml`. The required-status-check trap a path filter
introduces is resolved **inside that one workflow** — see § Workflow shape — not
by a second workflow file.

**Triggers:**

- **Nightly schedule** (`cron: '0 3 * * *'` UTC) — the primary trend signal.
  Runs both form factors at `numberOfRuns: 3`.
- **Pull requests against `main`** — the workflow always triggers on every PR to
  `main` (no `paths:` filter on the `on:` trigger). A `changes` pre-job computes
  whether the PR touched a perf-relevant surface; the audit job runs **only**
  when it did. Docs-, ADR-, and markdown-only PRs skip the audit job (but still
  receive a `Lighthouse Status` check — see § Workflow shape). PR runs are
  Mobile-only at `numberOfRuns: 1`.
- **`workflow_dispatch`** — on-demand re-run for investigation.

**Not triggered on `push` to `main`.** A push to `main` only follows a merged
PR; that content was already audited by the PR run (when perf-relevant) and is
re-audited by the nightly cron within 24 h. A `push: main` run is redundant with
both and re-introduces an every-merge audit cost.

### Configuration

LHCI 0.15.1's config loader (`@lhci/utils/src/lighthouserc.js`) flattens any
single config file to **exactly one** `ci.collect`, **one** `ci.assert`, and
**one** `ci.upload`. The `assert` step has no form-factor axis. One config file
plus one `lhci autorun` therefore measures and asserts **one** form factor. The
Mobile and Desktop form factors are consequently **two separate config files**,
each run by its own `autorun`.

`assert.assertions` is a plain object keyed by audit ID. Each audit ID carries
**exactly one** assertion at **exactly one** level — `'error'`, `'warn'`, or
`'off'`. A second entry for the same key silently overwrites the first. A metric
is therefore either an ERROR gate or a WARN gate at any given time, never both.
A metric's mode can change over time (a WARN raised to an ERROR via an ADR
amendment that edits the single entry).

**The gate is explicit-only — no preset.** None of the three config files'
`assert` blocks carries a `preset:` key. `@lhci/utils@0.15.1/src/assertions.js`
(`resolveAssertionOptionsAndLhrs`): `preset` defaults to `''`; the preset data
is merged in **only** when `preset.match(/lighthouse:(.*)$/)` is truthy; with no
`preset` key the merge is skipped and only the explicitly authored `assertions`
object is used. `auditsToAssert` is built from `Object.keys(assertions)` —
exactly and only the audit IDs the config names. The entry-point guard at
`@lhci/cli/src/assert/assert.js` line 54 (`areAssertionsSet`) confirms an
explicit-only config with no preset still runs `lhci assert` normally.

**The gate is exactly these 12 assertions** (the Desktop config asserts 11 of
them at day one — see the Desktop CLS note below):

| Layer            | Assertions                                                                                                                 |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------- |
| Category scores  | `categories:performance`, `categories:accessibility`, `categories:best-practices`, `categories:seo`                        |
| Core Web Vitals  | `largest-contentful-paint`, `first-contentful-paint`, `total-blocking-time`, `cumulative-layout-shift`                     |
| Resource budgets | `resource-summary:total:size`, `resource-summary:script:size`, `resource-summary:image:size`, `resource-summary:font:size` |

**Day-one exception — Desktop `cumulative-layout-shift`.** The Desktop config
**does not assert `cumulative-layout-shift` at day one**; the assertion is
deferred until the desktop-CLS follow-up stream lands (see § Budgets — Core Web
Vitals (Desktop), and § Status amendment 3). The Desktop config therefore
asserts **11** of the 12 day-one, the Mobile config asserts all 12, and the
Desktop set lifts to 12 once the assertion is re-added at the 0.1 floor.

**No preset and no other audit asserts.** The long tail of individual Lighthouse
audits — `color-contrast`, `unsized-images`, `unused-javascript`, the
`*-insight` family, and every other audit `lighthouse:recommended` would have
asserted — is **not** individually gated. It is covered **indirectly, at
aggregate level**, by the four `categories:*` assertions: a regression in any
member audit drags down its category score and trips the category assertion.
This is a deliberate trade: the explicit assertions are baseline-defended and
version-stable; per-audit gating of un-baselined audits would red on the
pre-existing `main` and would re-arm on every Lighthouse upgrade.

The per-audit a11y gate the project does have is **ADR-0052's component-level
axe layer**, which fails a single `color-contrast`-class violation outright with
no averaging. Lighthouse's `categories:accessibility` is the complementary
page-composition aggregate; its floor lifts from 85 to 95 after the a11y
follow-up stream lands (see § Status).

The configuration is **three CommonJS files at the repo root**:

- **`lighthouserc.cjs`** — the Mobile config. One `collect` block:
  `staticDistDir: 'dist'`, `numberOfRuns: 3` with median (overridden to 1 on PR
  runs — see § Workflow shape), the canonical 9-URL set, mobile form factor with
  default Slow-4G + 4× CPU throttling. One `assert` block (no `preset`) with the
  Mobile category-score and Core Web Vitals assertions, plus the four
  resource-transfer budgets `require()`d from `lighthouserc.shared.cjs`.
  `upload.target: 'temporary-public-storage'`.
- **`lighthouserc.desktop.cjs`** — the Desktop config. Same 9-URL set,
  `staticDistDir: 'dist'`, `numberOfRuns: 3` with median; one `collect` block
  using `settings.preset: 'desktop'` (a _collect_ preset — the 1350×940 /
  desktopDense4G form factor, unrelated to the _assert_ presets that were
  dropped). One `assert` block (no assert `preset`) with the Desktop
  category-score and Core Web Vitals assertions **except
  `cumulative-layout-shift`** (deferred — see above), plus the same four
  resource budgets `require()`d from the shared module.
- **`lighthouserc.shared.cjs`** — a shared module exporting the four
  worst-of-both resource-transfer budget assertions, `require()`d by both
  form-factor configs. Defined once, evaluated against both form factors'
  artefacts.

> **Note on `preset` terminology.** `collect.settings.preset: 'desktop'` in
> `lighthouserc.desktop.cjs` is a **Lighthouse collect preset** (a form-factor
> profile) and is retained — it is what makes the Desktop run a desktop run. The
> dropped `preset` is the **LHCI assert preset** (`lighthouse:no-pwa`), which
> lived in the `assert` block. The two are different keys in different blocks;
> only the assert preset is removed.

The canonical 9-URL set, identical in both form-factor configs' `collect.url`:

- `/` (homepage)
- `/services` (catalog)
- `/coaches`
- `/success-stories` (catalog)
- `/how-it-works`
- `/contact`
- `/services/competition-prep` (subscription-arm detail page)
- `/services/posing` (session-arm detail page)
- `/success-stories/sarah-m` (the single success-story detail slug today)

`upload.target: 'temporary-public-storage'` gives anonymous report URLs — 7-day
retention on the Google-operated public storage bucket — printed to the step
log. No LHCI server.

`.cjs` extension is required: the project's `package.json` declares
`"type": "module"`, and `@lhci/cli` 0.15.x's config loader uses synchronous
CommonJS `require()`. The same `require()` is what lets the two form-factor
configs pull in `lighthouserc.shared.cjs`. The files are deliberately
**non-dotted** — the workflow passes every config via explicit `--config=`, so
LHCI's auto-discovery is never exercised.

### Budgets — Category scores (0-100)

Day-one ERROR thresholds set against the empirical baseline measured against
`main@08f317b` (Lighthouse 12.6.1; Mobile: mobile form factor, simulate
throttling; Desktop: `desktop-config` preset). These four `categories:*`
assertions are the aggregate gate that covers the long tail of individual
audits.

#### Mobile

| Category       | Day-one (ERROR) | Target (post-baseline)       | Worst-URL baseline    | Rationale                                                                                                                                                                                          |
| :------------- | :-------------- | :--------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance    | **85**          | 90 (4-week amendment)        | 86 (`/services/`)     | Baseline-minus-1 floor against per-run flake (±2 points). The 4-week-of-clean-trend amendment lifts the floor to 90.                                                                               |
| Accessibility  | **85**          | 95 (post-a11y-fix amendment) | 89 (`/how-it-works/`) | Pre-existing a11y defects (`color-contrast`, `definition-list`/`dlitem`) keep the worst URL at 89. The 85 floor accommodates them; the 95 lift closes most of the slack the aggregate gate leaves. |
| Best Practices | **95**          | 95                           | 100 (all URLs)        | Comfortable headroom for flake. Lighthouse 12.6.1's `csp-xss` audit is `informative` (weight 0), so no Best-Practices loss from the header-only CSP per ADR-0030.                                  |
| SEO            | **95**          | 95                           | 100 (all URLs)        | Comfortable headroom for flake.                                                                                                                                                                    |

#### Desktop

| Category       | Day-one (ERROR) | Target (post-follow-up)      | Worst-URL baseline       | Rationale                                                                                                                                            |
| :------------- | :-------------- | :--------------------------- | :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance    | **80**          | 95 (post-desktop-CLS-fix)    | 83 (`/success-stories/`) | The worst desktop URL is dragged down by the desktop-specific CLS defect. 80 is baseline-minus-3. Lifts to 95 after the desktop-CLS follow-up lands. |
| Accessibility  | **85**          | 95 (post-a11y-fix amendment) | 89 (`/how-it-works/`)    | Desktop and mobile share the DOM, so the same a11y defects produce the same worst-URL scores. 85 matches the Mobile A11y floor.                      |
| Best Practices | **95**          | 95                           | 100 (all URLs)           | Comfortable headroom; desktop BP is 100 on every URL.                                                                                                |
| SEO            | **95**          | 95                           | 100 (all URLs)           | Comfortable headroom; desktop SEO is 100 on every URL.                                                                                               |

### Budgets — Core Web Vitals

Core Web Vitals are measured and asserted per form factor. Each is a **single
asserted ERROR threshold per audit ID** — `assert.assertions` carries one
assertion per audit ID. Where a Google "Good" figure is recorded, it is a
**documented improvement target** (an aspiration the ERROR floor tightens toward
over time via an ADR amendment), **not** a second WARN-level assertion.

#### Mobile (Lighthouse-simulated, Slow-4G + 4× CPU)

| Metric | Day-one ERROR | Google "Good" (improvement target, not asserted) | Worst-URL baseline    | Rationale                                                                                                                |
| :----- | :------------ | :----------------------------------------------- | :-------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| LCP    | **3500ms**    | 2500ms                                           | 3457ms (`/services/`) | Baseline-plus-margin ERROR floor — the only asserted threshold. Tightens toward 2500ms after the image-LCP follow-up.    |
| TBT    | **200ms**     | —                                                | 0ms (all URLs)        | Astro SSG ships near-zero JS; 200ms is the canary against accidental client-heavy patterns.                              |
| CLS    | **0.1**       | 0.1 (already met)                                | 0.021 (`/services/`)  | Google "Good". ADR-0010 image discipline keeps mobile CLS near zero. Asserted day-one — mobile CLS has a clean baseline. |
| FCP    | **3000ms**    | 1800ms                                           | 2932ms (`/services/`) | Baseline-plus-margin ERROR floor. Tightens toward 1800ms after the follow-up.                                            |

#### Desktop (Lighthouse `desktop-config` preset, desktopDense4G)

| Metric | Day-one ERROR    | Target (post-follow-up) | Baseline                                   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| :----- | :--------------- | :---------------------- | :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LCP    | **1500ms**       | —                       | 935ms (`/`)                                | Desktop LCP is 566–935ms — an order of magnitude inside Google "Good". A tight 1500ms floor is a real canary on a genuinely fast surface.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| TBT    | **200ms**        | —                       | 0ms (all URLs)                             | Desktop TBT is 0ms everywhere; 200ms is the canary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| CLS    | **NOT asserted** | 0.1 (re-added post-fix) | 0.367 (CI 3-run median, `/services/` only) | **Phase-4 deferral.** The first CI run's 3-run median measured Desktop CLS on `/services/` at **0.367** (flake-free: `all values: 0.366794, 0.366794, 0.366794`), above the shipped 0.35 floor. LHCI prints only failing assertions, so the job log gives **no** precise Desktop CLS value for `/how-it-works/` or `/success-stories/` — it proves only that they are ≤ 0.35. There is no clean desktop-CLS baseline and no defensible threshold (a 0.40 floor would be "0.367 rounded up", grounded in the defect rather than a baseline — which § Decision drivers forbids). The Desktop `cumulative-layout-shift` assertion is therefore **dropped at day one**. It is re-added at the Google-"Good" **0.1** floor — a number with real baseline meaning — once the desktop-CLS follow-up stream measures desktop CLS clean. Meanwhile a new desktop layout shift still trips the Desktop `categories:performance` assertion (CLS is a Performance member audit) and, for shared-DOM markup defects, the Mobile `cumulative-layout-shift` assertion. |
| FCP    | **1200ms**       | —                       | 611ms (`/`)                                | Desktop FCP is 446–611ms. 1200ms is a tight floor with GHA-host margin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

INP (Interaction to Next Paint) is field-only — Lighthouse Lab cannot measure
it. Not part of this budget. A future RUM source is a separate ADR.

### Budgets — Resource transfers

The four resource-transfer budgets are defined **once** — in
`lighthouserc.shared.cjs` — and `require()`'d into **both** form-factor configs.
They are defined once but evaluated against both form factors' artefacts: the
Mobile `autorun` asserts them against the mobile LHRs, the Desktop `autorun`
against the desktop LHRs. Each threshold is keyed off the
**worst-of-both-form-factors** baseline. They are **WARN-mode day-one and flip
to ERROR after 4 weeks** of clean nightly runs — a level change over time via an
ADR amendment.

| Resource        | Day-one (mode) | Post-4-week (mode) | Worst-URL baseline (worst-of-both)  | Rationale                                                                        |
| :-------------- | :------------- | :----------------- | :---------------------------------- | :------------------------------------------------------------------------------- |
| Total transfer  | 600KB (WARN)   | 600KB (ERROR)      | 373KB (`/`, mobile)                 | Comfortable; the WARN→ERROR flip locks in the headroom.                          |
| Script transfer | 150KB (WARN)   | 125KB (ERROR)      | 125KB (`/`)                         | Form-factor-identical. 150KB WARN initially; 125KB ERROR after 4 weeks of trend. |
| Image transfer  | 400KB (WARN)   | 400KB (ERROR)      | 15KB (`/success-stories/`, desktop) | Vast headroom; WARN-mode preserves room for future hero swaps.                   |
| Font transfer   | 100KB (WARN)   | 100KB (ERROR)      | 51KB (all URLs)                     | Form-factor-identical. Headroom for a future weight addition.                    |

**4-week window — owner decision.** The owner decided the WARN→ERROR window at
**4 weeks** (≈ 28 nightly runs; per-run score variance ±2 points; 28 runs reduce
the standard error of the mean to ±0.4 — tight enough to distinguish trend
regression from flake).

### Workflow shape

**One workflow file: `lighthouse.yml`.** There is no second workflow file. The
required-status-check trap a path filter introduces is resolved by moving the
path filter off the `on:` trigger and onto an in-workflow `changes` pre-job.

#### The required-check trap and its in-workflow resolution

The gate is planned to flip to a **required status check** after 3 clean nightly
runs. GitHub's required-status-check mechanism waits for a check of a specific
**name** on every PR. If a workflow's `on:` trigger carried a `paths:` filter, a
docs-only PR would not trigger the workflow at all — _no_ job would run and _no_
check of any name would report — and branch protection would leave the PR
`Pending` forever, unmergeable. A `paths:`-filtered _trigger_ and a required
check are mutually exclusive.

The resolution keeps **one workflow** and moves the path decision from the
trigger to a job:

1. The `on:` trigger has **no `paths:` filter** — `lighthouse.yml` always
   triggers on every `pull_request` to `main`.
2. A `changes` pre-job runs on every PR and computes whether the PR touched a
   perf-relevant surface (a boolean output `perf-relevant`).
3. The heavy `lighthouse` audit job carries
   `if: needs.changes.outputs.perf-relevant == 'true'` — it is **skipped** on
   docs-only PRs (no audit, no CI-minute cost) and runs otherwise.
4. The `lighthouse-status` job — `needs: [changes, lighthouse]`, `if: always()`,
   named exactly `Lighthouse Status` — **always runs** and reports the
   branch-protection check per the outcome contract below.

A job-level `if:` _skips_ a job; a skipped job still reports a `skipped`
conclusion that a downstream `needs:` job reads. The status job's `needs:`
reaches the audit job and the `changes` job **within the same file** — the
mechanism a cross-workflow design lacks. (A separate `lighthouse-gate.yml`
workflow was evaluated and rejected: a second workflow cannot read a sibling
workflow's conclusion within `contents: read` — `needs:` is same-file-only, and
a `workflow_run`/Checks-API mirror needs `actions: read` + `checks: write` and
post-event plumbing.)

#### Jobs

- **`changes`** — the path-filter pre-job. Runs on every event. `contents: read`
  only. It runs `dorny/paths-filter` (SHA-pinned with a `# v<version>` comment
  per S6596) in the **`git`-diff mode**: the action computes the changed-file
  set by diffing the PR head against the PR base ref with `git`, so the job
  carries its own `actions/checkout` step (SHA-pinned) with **`fetch-depth: 0`**
  — the default `fetch-depth: 1` does not fetch the base ref. The `git`-diff
  mode is chosen over the API list-files mode because it keeps the `changes` job
  at `contents: read` only: the API list-files mode would call
  `GET /repos/{owner}/{repo}/pulls/{N}/files`, a pull-requests REST resource
  that needs `pull-requests: read` under granular permissions. The
  `dorny/paths-filter` step carries `if: github.event_name == 'pull_request'`;
  the job's `perf-relevant` output is `'true'` for non-`pull_request` events
  (`schedule`, `workflow_dispatch` — which have no PR diff) and the
  `dorny/paths-filter` result for `pull_request` events, so the nightly / manual
  run always audits.
- **`lighthouse`** — the audit job. `needs: changes`,
  `if: needs.changes.outputs.perf-relevant == 'true'`. Builds the site and runs
  the `lhci` audit(s). `contents: read` + `actions: read` (the job-summary and
  artifact-upload steps need `actions: read`).
- **`lighthouse-status`** — `needs: [changes, lighthouse]`, `if: always()`, name
  `Lighthouse Status`, `contents: read` only. Its full GREEN/RED contract is the
  outcome table immediately below.

#### The `lighthouse-status` outcome contract

The `lighthouse-status` job is the branch-protection check. Its verdict must
distinguish a **legitimate path-skip** of the audit (a docs-only PR — GREEN)
from an audit skipped because the `changes` pre-job itself **failed** (an infra
fault — RED). A failed `changes` job produces **no outputs**, so
`needs.changes.outputs.perf-relevant` reads as the **empty string `''`** — which
is neither `'true'` nor `'false'`. The contract therefore checks
`needs.changes.result` as a precondition of the legitimate-skip GREEN branch:
`needs.lighthouse.result` is `'skipped'` in _both_ the path-skip and the
`changes`-failure cases, so the audit result alone cannot tell them apart.

Every event/result combination the workflow can produce:

| #   | Event                            | `needs.changes.result`  | `changes` `perf-relevant` | `needs.lighthouse.result` | `Lighthouse Status` | Why                                                                              |
| :-- | :------------------------------- | :---------------------- | :------------------------ | :------------------------ | :------------------ | :------------------------------------------------------------------------------- |
| 1   | `pull_request` (docs-only)       | `success`               | `'false'`                 | `skipped`                 | **success**         | Legitimate path-skip — nothing perf-relevant changed.                            |
| 2   | `pull_request` (perf-relevant)   | `success`               | `'true'`                  | `success`                 | **success**         | Audit ran and passed.                                                            |
| 3   | `pull_request` (perf-relevant)   | `success`               | `'true'`                  | `failure`                 | **failure**         | Audit ran and a budget failed.                                                   |
| 4   | `pull_request` (perf-relevant)   | `success`               | `'true'`                  | `cancelled`               | **failure**         | Audit was cancelled — no conclusion, do not green.                               |
| 5   | any                              | `failure` / `cancelled` | `''` (no outputs)         | `skipped`                 | **failure**         | `changes` pre-job itself failed — audit skipped, must NOT green.                 |
| 6   | `schedule` / `workflow_dispatch` | `success`               | `'true'`                  | `success`                 | **success**         | Non-PR event: `changes` sets `perf-relevant='true'`, audit runs unconditionally. |
| 7   | `schedule` / `workflow_dispatch` | `success`               | `'true'`                  | `failure` / `cancelled`   | **failure**         | Non-PR audit ran and failed/was cancelled — mirrors the audit.                   |

Rows 1, 2, 6 are the only GREEN rows. The load-bearing predicate, in GitHub
Actions expression syntax — GREEN when this is `true`, RED otherwise:

```yaml
${{ (needs.changes.result == 'success' && needs.lighthouse.result == 'skipped'
&& needs.changes.outputs.perf-relevant == 'false') || needs.lighthouse.result ==
'success' }}
```

The non-negotiable properties: (1) the legitimate-skip GREEN branch requires
**all three** of `needs.changes.result == 'success'`,
`needs.lighthouse.result == 'skipped'`, and
`needs.changes.outputs.perf-relevant == 'false'` — the empty-string
`perf-relevant` from a failed `changes` job is not `'false'`, so a `changes`-job
failure cannot reach GREEN (row 5 → RED); (2) the comparison on `perf-relevant`
is `== 'false'`, **never** `!= 'true'`, which would treat the empty string as a
legitimate skip and silent-green row 5; (3) audit `failure` and `cancelled` are
both RED — only an explicit `needs.lighthouse.result == 'success'` greens an
audit that ran.

#### The perf-relevant path list

The `changes` job's `dorny/paths-filter` filter list — what can change the built
`dist/` artefact Lighthouse measures:

- `src/**` — pages, components, styles, scripts
- `public/**` — static assets copied verbatim into `dist/`
- `astro.config.mjs` — build configuration (exact path; the project uses the
  `.mjs` extension)
- `.nvmrc` — the workflow pins the Node version via `node-version-file: .nvmrc`;
  a Node-major bump can change the Astro build output (esbuild/Vite behaviour,
  polyfill set, minification). An exact-path build input.
- `tsconfig.json` — Astro reads `tsconfig.json`; a `compilerOptions` change can
  alter emitted JS. An exact-path build input. (No `tsconfig.*.json` variants
  exist at the repo root.)
- `package.json`, `pnpm-lock.yaml` — dependency changes (Renovate bumps).
  **Load-bearing for OQ2 — see the OQ2 path-list contract below.**
- `lighthouserc.cjs`, `lighthouserc.desktop.cjs`, `lighthouserc.shared.cjs` —
  the budget configs themselves
- `.github/workflows/lighthouse.yml` — the workflow editing itself (the only
  Lighthouse workflow file — there is no second one)

**OQ2 path-list contract.** Requirements OQ2 resolved that every PR including
Renovate / Dependabot dependency-update PRs must be audited — auto-merge without
a Lighthouse signal would defeat the gate. With the audit job-gated by the
perf-relevant list, OQ2 is honoured **only because** `package.json` and
`pnpm-lock.yaml` are in that list: every bot / dependency-update PR touches at
least one of those two files, so the `changes` job reports
`perf-relevant == 'true'` and the audit runs. **`package.json` and
`pnpm-lock.yaml` are therefore load-bearing for OQ2 and must not be removed from
the perf-relevant list without an explicit decision to re-open OQ2** — removing
either silently re-opens the gap the owner closed (a dependency bump could
merge, auto-merge included, with no Lighthouse signal). The rest of the list is
tunable post-merge; these two entries are the fixed point.

**`netlify.toml` is deliberately excluded.** The LHCI static server serves
`dist/` **without** Netlify response headers, so a `netlify.toml` cache-header
edit cannot move a number Lighthouse measures under LHCI (the `cache-insight` /
`uses-long-cache-ttl` audits WARN under LHCI regardless of the production cache
policy — see § Out of scope item 10). Excluding `netlify.toml` is a deliberate
decision, not an oversight. The CSP-hash half of `netlify.toml` is
build-generated from `src/**`, which _is_ in the list.

#### PR vs. nightly run profile

A `pull_request` run is **Mobile-only at `numberOfRuns: 1`** — a ~3-minute smoke
gate. A `schedule` / `workflow_dispatch` run is **both form factors at
`numberOfRuns: 3`** — the authoritative ~11-minute trend signal whose 3-run
median the WARN→ERROR arithmetic depends on. The `numberOfRuns` difference is a
`--collect.*` CLI override on the PR step; the form-factor difference is an
event-name `if:` that runs only the Mobile `autorun` on `pull_request`. The
Desktop step's `if:` composes the event-name term with the existing
not-cancelled term so Desktop still runs when Mobile asserts red on a nightly
run.

#### Other workflow facts

- **Concurrency:**
  `${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}`,
  `cancel-in-progress: true`.
- **Steps (audit job):** `actions/checkout@<sha> # v6`, `corepack enable`,
  `actions/setup-node@<sha> # v6` (`node-version-file: .nvmrc`, `cache: pnpm`),
  `pnpm install --frozen-lockfile --prefer-offline`, `pnpm run build`, then the
  `lhci` audit step(s), a job-summary table, and an upload of `.lighthouseci/`
  as a GHA artifact.
- **Steps (`changes` job):** `actions/checkout@<sha> # v6` with `fetch-depth: 0`
  (so `dorny/paths-filter`'s `git`-diff can reach the PR base ref) and
  `dorny/paths-filter@<sha> # v<version>`. Both SHA-pinned.
- **Artifact-copy fix.** `lhci autorun` with
  `upload.target: 'temporary-public-storage'` uploads the LHRs to the Google
  bucket but does not retain a copy in `.lighthouseci/` for the GHA-artifact
  step. The workflow runs the audit as `lhci collect` + `lhci assert` +
  `lhci upload` separate steps (or adds an `if: always()`
  `lhci upload --target=filesystem --outputDir=.lighthouseci` step) so the LHR
  JSON is on disk before `actions/upload-artifact` runs. Without this fix the
  30-day artifact never materialises (the first CI run produced "No files were
  found").
- **`timeout-minutes: 15`** — covers the ~11-minute nightly worst case with a
  margin; generous for the ~3-minute PR path.
- **Per-job permissions:** `changes` — `contents: read`; `lighthouse` —
  `contents: read` + `actions: read`; `lighthouse-status` — `contents: read`. No
  `pull-requests` scope — no job writes to the PR, and the `git`-diff
  `dorny/paths-filter` mode reads no pull-requests API. Sonar S8264 / S8233
  satisfied.
- **Reporting surfaces** — the PR status check (`Lighthouse Status`, from the
  `lighthouse-status` job), the job-summary table, the
  `temporary-public-storage` step-log report URLs, and the 30-day GHA artifact.
  None is a PR comment.

#### Branch protection at day one

**Monitor-only.** `Lighthouse Status` is NOT added to the required-check list at
day one; the owner flips it to required after 3 consecutive clean nightly runs
on `main`. README badge label stays `Lighthouse` from day one.

### Monitor-only at day one — first-principles defence

The gate ships **monitor-only** and the owner flips it to required after **3
consecutive clean nightly runs on `main`**. Defended on first principles:

1. **The introductory PR cannot self-gate honestly.** The day-one thresholds are
   derived from a Win11-host baseline; the first CI runs are the first
   measurement on the GHA-Ubuntu surface the gate lives on. A required check on
   the introductory PR would block it on un-CI-validated thresholds.
2. **3 runs is the smallest sample that distinguishes "stable" from "first-run
   luck".**
3. **The flip is a deliberate, recorded step** — a dated checklist item in
   `docs/MAINTENANCE.md`, targeting the `lighthouse-status` job's
   `Lighthouse Status` check inside `lighthouse.yml`.

The job-level path gate (the `changes` pre-job) is what keeps the
flip-to-required possible: because the `lighthouse-status` job always runs, the
`Lighthouse Status` check reports on every PR — including docs-only PRs — so
branch protection never hangs. A workflow-level `paths:` filter would make the
flip impossible (a skipped workflow reports no check); that alternative is the
"permanently monitor-only by design" path, recorded as an owner decision.

### Failure strategy summary

| Layer                                                       | Mode                                | Blocks at                                              |
| :---------------------------------------------------------- | :---------------------------------- | :----------------------------------------------------- |
| Category scores (Performance / A11y / Best Practices / SEO) | ERROR                               | Day one                                                |
| Core Web Vitals (LCP / TBT / FCP), Mobile and Desktop       | ERROR (single threshold per metric) | Day one                                                |
| `cumulative-layout-shift` — Mobile                          | ERROR                               | Day one                                                |
| `cumulative-layout-shift` — Desktop                         | Deferred — not asserted day-one     | After the desktop-CLS follow-up re-adds it at 0.1      |
| Resource transfer budgets (Total / Script / Image / Font)   | WARN day-one, ERROR after 4 weeks   | After 4 weeks of clean nightly runs (ADR amendment)    |
| Branch-protection required check                            | Not enforced at day one             | After 3 consecutive clean nightly runs (owner-flipped) |

**These 12 assertions are the entire asserted set** (the Desktop config asserts
11 day-one — Desktop `cumulative-layout-shift` deferred). There is no preset; no
other Lighthouse audit asserts. The long tail of individual audits is covered
indirectly by the four `categories:*` assertions — a regression in any member
audit drags down its category score. The **per-audit** a11y gate is ADR-0052's
component-level axe layer (a single `color-contrast`-class violation fails it
outright); Lighthouse's `categories:accessibility` is the page-composition
aggregate. The one residual gap — a page-composition-only a11y regression small
enough to keep the category above 0.85 — is closed by the A11y threshold lift
from 85 to 95 after the a11y follow-up stream lands.

### Renovate strategy

`renovate.json` carries a `packageRules` entry routing `@lhci/cli` to manual
review (`automerge: false`). `@lhci/cli` carries `lighthouse` as a transitive
dependency; a minor bump can shift scoring weights. The explicit-only gate makes
a new _audit_ harmless (an unnamed audit ID is not asserted), but a
scoring-weight shift can still move the `categories:*` numbers — the
manual-review lane makes every Lighthouse upgrade a deliberate PR with the audit
signal visible. Adding `dorny/paths-filter` brings one more GitHub-Actions
digest pin under Renovate's `helpers:pinGitHubActionDigests` preset — it is
tracked automatically, no `renovate.json` edit is needed.

### Verification of OQ6 (`csp-xss` audit)

Verified empirically: in every LHR, `audits.csp-xss.score = 1`,
`scoreDisplayMode = "informative"`, `weight: 0`. The audit is present but not
scored. Under the explicit-only strategy `csp-xss` is **never one of the named
assertions**, so it is never asserted at all — the `'csp-xss': 'off'` entry
requirements OQ6 prescribed is unnecessary and is **not added**. OQ6's intent
(do not let `csp-xss` block merge) is satisfied structurally by explicit-only.
The CSP strategy in ADR-0030 (header-applied via `netlify.toml`) is unaffected
by Lighthouse.

### What does NOT change

- `quality.yml`, `tests.yml`, `semgrep.yml`, `links.yml`, `csp-drift.yml` are
  unmodified.
- The CSP hash strategy (ADR-0030) is unaffected.
- The pre-push gate sequence is unchanged. Lighthouse runs in CI only.
- Component-level a11y (ADR-0052) continues to cover per-component regressions
  at unit-test time — and is the per-audit a11y gate complementing this ADR's
  aggregate `categories:accessibility` assertion.

### Scope and non-goals

**In scope:** Lighthouse audits of the 9 URLs above, Mobile and Desktop, with
the explicit-only assertion gate (12 assertions; Desktop 11 day-one). Path-gated
PR runs, nightly trend runs, the in-workflow status job. Renovate manual-review
lane for `@lhci/cli`.

**Out of scope:** LHCI server self-hosting. RUM / field-data CWV / INP.
Lighthouse-on-deploy-preview. E2E user-flow performance tests. A PR-comment
reporting step. SonarCloud quality-gate integration. Modifications to existing
workflows. Adding Lighthouse to the local Pre-Push Gate. Per-audit gating of the
long tail of individual Lighthouse audits (covered indirectly by the
category-score assertions; the substantive ones are follow-up streams). Audit of
`/privacy`, `/terms`, `/contact/thanks`.

**Defects surfaced by the first CI run — follow-ups, not part of this ADR.** The
first real CI run surfaced eleven distinct audit findings. Under the
explicit-only strategy none is individually asserted — they feed the category
scores (which passed at ≥ 0.85). They are **informational follow-ups**:

1. `color-contrast` — every URL, both form factors. Real a11y defect. A11y
   follow-up stream.
2. `definition-list` + `dlitem` — `/how-it-works/`,
   `/services/competition-prep/`. Real a11y defect (malformed `<dl>` markup).
   Same a11y follow-up stream.
3. Desktop layout-shift defect — `/services/` Desktop CLS 0.367 (CI 3-run
   median); `/how-it-works/` and `/success-stories/` Desktop CLS ≤ 0.35 (exact
   CI median not in the job log — LHCI prints only failures). Real
   desktop-viewport CLS defect, worse than the single-run baseline showed on
   `/services/`. Desktop-CLS follow-up stream; the Desktop
   `cumulative-layout-shift` assertion is deferred until it lands.
4. `unsized-images` — every URL, both form factors. Images without explicit
   `width`/`height`. Feeds CLS. Follow-up.
5. `image-redundant-alt` — `/services/` Mobile. An image whose `alt` restates
   adjacent text. Small, local. Follow-up.
6. `unused-javascript` — every URL, both form factors. Bundled JS unused on the
   audited page. Follow-up.
7. `lcp-discovery-insight` — every URL. Lighthouse "insight" audit — LCP image
   not discoverable early. Low-priority follow-up.
8. `network-dependency-tree-insight` — every URL. "Insight" audit, request-
   chain depth. Diagnostic; low-priority.
9. `cls-culprits-insight` — Desktop `/services/`. "Insight" audit naming the
   layout-shift culprits — diagnostic companion to #3.
10. `cache-insight` / `uses-long-cache-ttl` — every URL (WARN). A
    **Netlify-CDN-headers** concern, not a `dist/`-content defect: LHCI's static
    server serves `dist/` without Netlify cache headers, so this audit always
    WARNs under LHCI regardless of the real production cache policy. Expected
    LHCI-vs-production divergence — no action. (This is also why `netlify.toml`
    is deliberately excluded from the perf-relevant path list.)
11. `render-blocking-insight` / `render-blocking-resources` — every URL (WARN).
    A render-blocking request (likely the stylesheet). Diagnostic; low-priority.

Items 1–3 are the substantive follow-up streams; each lands via a fresh Phase 1
→ 2 → 3, not a drive-by fix in the introducing PR. Items 4–11 are registered for
completeness; most are diagnostic and the category scores already pass despite
them.

## Consequences

### Positive

- Performance, page-level a11y, best practices, and SEO regressions are caught
  on perf-relevant PRs before reaching production, and on `main` nightly.
- The explicit-only gate is **version-stable**: a Lighthouse audit addition
  cannot silently become a merge-blocking assertion.
- The explicit-only gate is **honest**: the ADR and the config JSDoc name
  precisely the assertions that are the gate; there is no hidden ~50-audit
  preset surface. Every asserted threshold is baseline-defended — including the
  decision to _defer_ the Desktop CLS assertion rather than ship a number with
  no baseline meaning.
- Mobile and Desktop are evaluated against appropriate budgets; the two-config
  split makes the asymmetry structurally explicit.
- Path-gated PR runs mean docs-only PRs are not delayed by an 11-minute audit;
  the 1-run Mobile-only PR profile gives ~3-minute feedback on perf-relevant
  PRs. A single workflow keeps the `Lighthouse Status` check reporting on every
  PR, so the flip-to-required stays viable.
- The `lighthouse-status` outcome contract is fully specified — a failure of the
  `changes` pre-job lands RED, never silent-green, so an infra fault cannot let
  a regression merge unaudited.
- Nightly trend visibility (3-run median, both form factors) surfaces slow drift
  that PR-level audits can miss.
- The monitor-only-then-required activation prevents introductory-PR-suicide;
  the in-workflow `changes`-gate keeps the flip-to-required path open under the
  path filter without a second workflow file.

### Negative

- **The gate is a weaker per-audit gate than a preset would be** — at
  `categories:accessibility` ≥ 0.85, a page-composition-only a11y regression
  modest enough to keep the category above 0.85 could merge without tripping the
  Lighthouse gate. This window is bounded: it closes when the A11y floor lifts
  to 95 after the a11y follow-up, and the per-audit a11y gate meanwhile lives in
  ADR-0052's axe layer. The accepted trade is: explicit-only does not red on the
  pre-existing `main`, and a preset would have to be switched off audit-by-audit
  to the same effective gate.
- **No merge-blocking Desktop CLS assertion at day one.** Deferring the Desktop
  `cumulative-layout-shift` assertion means a new desktop-_only_ layout shift,
  on a page not already defective, large enough to matter but small enough to
  not move the Desktop Performance score, could merge unblocked between day one
  and the desktop-CLS follow-up. The gap is narrow (a new desktop layout shift
  usually trips Desktop `categories:performance` and, for shared-DOM markup
  defects, the Mobile CLS assertion), and the nightly run still measures and
  reports desktop CLS. It is the accepted price of keeping every asserted
  threshold baseline-defended — a 0.40 floor would be a fake canary.
- A path-gated PR trigger requires the in-workflow `changes` pre-job to keep the
  flip-to-required viable — a few extra lines of YAML plus an `actions/checkout`
  step in the `changes` job, but no second workflow file.
- CI minutes: the nightly run is ~11 minutes (54 Lighthouse runs); PR runs are
  ~3 minutes. GitHub Actions free-tier for public repositories is unlimited.
- Initial baselining of the resource budgets requires 4 weeks of nightly runs
  before they can block.
- Lighthouse Lab is simulated, not real-user; INP is not measured.
- Score volatility ±2 points; `numberOfRuns: 3` median (nightly) mitigates it;
  the 1-run PR profile does not — the PR run is a smoke gate, the nightly is the
  authoritative signal.
- The day-one Desktop Performance (80) threshold is loosened around the
  pre-existing desktop-CLS defect; it lifts to 95 after the follow-up lands.

### Risk mitigation

- **Explicit-only assertion strategy** removes the version-instability and
  pre-existing-baseline-failure risks the preset carried.
- **Three runs with median selection** (nightly) mitigates score volatility.
- **Dedicated workflow** isolates Lighthouse failures from the fast lanes.
- **In-workflow `changes`-gate + always-running `lighthouse-status` job** keeps
  the flip-to-required path viable under the path filter — within one workflow
  file and `contents: read` scope. The `lighthouse-status` outcome contract
  treats a `changes`-job non-success as RED, so an infra fault in the pre-job
  cannot silent-green the required check.
- **Monitor-only at day one** + **3-clean-nightly-runs activation gate**
  prevents introductory-PR-suicide.
- **Renovate manual-review lane for `@lhci/cli`** surfaces Lighthouse upgrades
  as PRs with the audit signal visible.

## Success criteria

- The `lighthouse.yml` workflow runs the audit job on perf-relevant PRs against
  `main` and produces a check result; the `lighthouse-status` job produces a
  `Lighthouse Status` check on **every** PR (success-by-default when the audit
  was legitimately path-skipped; RED when the `changes` pre-job itself failed).
- The introductory PR's own re-run goes green under the explicit-only gate.
- Three consecutive clean nightly runs on `main` allow the owner to flip
  `Lighthouse Status` (the `lighthouse-status` job) into the required-check
  list.
- Four weeks of clean nightly runs after activation allow the WARN-mode resource
  budgets to flip to ERROR (ADR amendment).
- The a11y follow-up stream reduces the worst-URL Accessibility score to 95+,
  allowing the Accessibility thresholds to lift from 85 to 95.
- The desktop-CLS follow-up stream reduces desktop CLS to ≤ 0.1, allowing the
  deferred Desktop `cumulative-layout-shift` assertion to be **re-added** at the
  0.1 floor and the Desktop Performance threshold to lift from 80 to 95.

## Documentation Updates

The following land in the same commit series as this ADR revision:

- `docs/ARCHITECTURE.md#adr-quick-reference` — row 0053 Key Insight:
  "Explicit-only Lighthouse gate (4 category + 4 CWV + 4 resource budgets;
  Desktop CLS deferred), path-gated PRs + nightly, monitor→required after 3
  clean nightly runs, WARN→ERROR resource budgets after 4 weeks."
- `docs/ARCHITECTURE.md#performance-and-quality-gates` — correct "every PR,
  every push to `main`" to "path-gated pull requests and a nightly schedule";
  correct the "baseline-defended budgets" framing to name the explicit-only
  gate.
- `docs/MAINTENANCE.md#lighthouse-ci` — trigger table (drop the push-main row,
  note the PR audit is path-gated); § Changing a budget (the Desktop CLS
  amendment line now reads "re-add the deferred Desktop CLS assertion at the 0.1
  floor"); Activation checklist (the required check is `Lighthouse Status`, the
  `lighthouse-status` job in `lighthouse.yml`; the audit job is path-gated and
  must not be the required check); Branch Protection table; the
  general-principle paragraph on status jobs running unconditionally (corrected
  to describe the always-running status job as the _solution_ to a deliberately
  path-gated main job, not a warning against skipping).
- `CLAUDE.md#conventions-quick-reference` — the Lighthouse bullet ("Lighthouse
  CI on PRs and nightly; budgets in ADR-0053") remains accurate; no change
  required.
- `README.md` — no change (the badge points at `lighthouse.yml`, which still
  exists; there is no second workflow).

`docs/CONVENTIONS.md`, `docs/AGENTS.md`, and `CONTRIBUTING.md` are **not**
updated: Lighthouse is a CI-side gate, not an edit-time coding pattern, not an
agent-collaboration-architecture change, not a commit/branch/PR-workflow change.

## References

- ADR-0010 — SmartImage + ImageSource (CLS discipline).
- ADR-0022 — Hybrid rendering model (the Astro SSG default that keeps TBT near
  zero).
- ADR-0030 — CSP hash strategy (interaction with Lighthouse's static server).
- ADR-0034 — Extract-first for AI-assisted development.
- ADR-0052 — Component-level accessibility testing with axe-core — the
  **per-audit** a11y gate complementing this ADR's page-composition aggregate
  `categories:accessibility` assertion.
- `@lhci/cli` configuration —
  https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
- `dorny/paths-filter` — https://github.com/dorny/paths-filter
- Web Vitals thresholds — https://web.dev/vitals/

## Status (post-baseline amendments)

This section records the baseline-driven amendments, each landing as its own
separate commit:

1. **WARN→ERROR resource-budget flip** — scheduled 4 weeks after activation.
   Flips Total / Script / Image / Font budgets from WARN to ERROR (Script also
   tightens 150KB → 125KB). Single-file edit in `lighthouserc.shared.cjs`.
2. **Accessibility-threshold lift to 95** — after the a11y follow-up stream
   (`color-contrast`, `definition-list` / `dlitem`) lands and the worst-URL A11y
   score reaches 95+. Lifts both Mobile and Desktop Accessibility thresholds
   from 85 to 95.
3. **Desktop Performance lift + Desktop CLS assertion re-add, and Mobile LCP/FCP
   ERROR tightening** — (a) after the desktop-CLS follow-up lands and desktop
   CLS on the affected URLs is measured ≤ 0.1 on the CI surface, **re-add** the
   Desktop `cumulative-layout-shift` assertion to `lighthouserc.desktop.cjs` at
   the Google-"Good" `maxNumericValue: 0.1` ERROR floor (lifting the Desktop set
   from 11 to 12 assertions), and lift the Desktop Performance ERROR threshold
   80 → 95. (b) after the image-LCP optimisation follow-up lands, tighten the
   Mobile LCP ERROR threshold toward 2500ms and the Mobile FCP ERROR threshold
   toward 1800ms (both in `lighthouserc.cjs`).
