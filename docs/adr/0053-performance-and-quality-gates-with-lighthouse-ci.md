# Performance and Quality Gates with Lighthouse CI

Date: 2026-05-19

## ADR Warrant Check

- [x] **A — Contract:** The budgets defined below become CI gates on PR builds.
      A regression below an ERROR-mode threshold blocks the PR. A regression
      below a WARN-mode threshold surfaces in the job-summary table and the step
      log but does not block. The budget numbers, the WARN vs. ERROR assignment,
      the WARN→ERROR transition window (4 weeks of clean nightly runs on
      `main`), and the monitor→required transition (3 consecutive clean nightly
      runs) are the contract. Any change requires explicit owner sign-off and an
      update to this ADR's Status.
- [x] **B — Asymmetry:** Mobile and Desktop budgets are deliberately different
      and tracked separately. A future "harmonising" PR that collapses them to a
      single set would be a regression — mobile is throttled (Slow-4G + 4× CPU)
      and operates against a stricter LCP / FCP / Performance-score floor than
      desktop, while desktop FCP / LCP run an order of magnitude faster and
      carry correspondingly tighter ERROR floors. The asymmetry is the design
      intent, and the two form factors live in two separate config files (see §
      Configuration).
- [ ] **C — External revisit:** Not invoked today. Revisit triggers surface
      naturally if (a) the site migrates off Astro SSG (ADR-0022 change), (b)
      Stripe-backed dynamic routes ship and the per-route budget diverges, or
      (c) a real-user-monitoring source for INP becomes available.

## Status

Accepted

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

Component-level accessibility (ADR-0052, shipping in parallel) catches
axe-detectable violations per component at unit-test time. Lighthouse runs
page-level accessibility, performance, best practices, and SEO against the
**produced HTML, CSS, JS, and images** as a browser sees them. The two layers
are deliberately separate and complementary — axe-in-jsdom evaluates an
unmounted DOM fragment; Lighthouse-in-Chrome evaluates the full rendered page
including paint events, network sequencing, and layout stability.

### Decision drivers

- **Mobile-first audience.** Budgets are derived for mobile-throttled lab
  conditions; desktop is tracked separately at its own floors.
- **Marketing site, revenue relevance.** Performance and SEO regressions
  translate to lost leads. The cost of "we'll catch it manually" is real.
- **Solo maintainer.** Budgets must be defensible in the absence of team
  consensus; every threshold has an explicit rationale grounded in the baseline
  measurement, not an aspiration.
- **AI-first working mode.** The project optimises for typed boundaries, low
  blast radius, and structural enforcement over per-contributor discipline. A CI
  gate is structural; "remember to run Lighthouse" is discipline.
- **CI laneing.** Lighthouse runs a full Astro build plus 3 audit passes per URL
  on two form factors — wall-clock 3-5 minutes. It must not slow the fast
  `quality.yml` and `tests.yml` lanes.
- **No paid SaaS.** Per the Cost-Conscious Operational Principle. No self-hosted
  LHCI server; `temporary-public-storage` report URLs surfaced in the step log
  are the trend mechanism.

### Evaluated approaches

1. **`@lhci/cli` in dedicated `.github/workflows/lighthouse.yml`,
   `staticDistDir` against `dist/`, separate Mobile and Desktop runs.**
   **Chosen.** Builds the site, serves `dist/` with LHCI's built-in static
   server, runs Lighthouse three times per URL per form factor with median
   selection, asserts against the budgets defined below. Reports via the PR
   status check (pass/fail), a job-summary table in the GitHub Actions run, and
   `temporary-public-storage` report URLs printed to the step log. The version
   surface is auditable in `package.json` + `pnpm-lock.yaml` (Renovate-visible,
   Socket.dev-gated).
2. **`@lhci/cli` inside the existing `quality.yml`.** Rejected on workflow-shape
   grounds. `quality.yml` is the fast source-level lane (~30s with cache); LHCI
   is the slow build-output lane (~5 min). Mixing the two either slows down the
   fast lane or forces conditional skips that re-open the silent-drift surface
   the gate is meant to close. The per-job permission profile also differs —
   `quality.yml` needs only `contents: read`, while Lighthouse adds
   `actions: read` for its job-summary and artifact steps; folding Lighthouse in
   would also tie a slow lane to the fast lane's check name.
3. **No automated audit; rely on manual Lighthouse runs.** Rejected. Manual
   audits drift; the project has no automated audit of the built artefact today
   and would not reliably run one going forward.
4. **Lighthouse against Netlify deploy-preview URLs.** Considered. Tests the
   actual CDN, but couples CI timing to deploy-preview completion and tests a
   non-deterministic surface (CDN cache state, edge response timing). The
   static-server approach is deterministic and runs in-band; CDN-level
   performance is monitored separately if needed (future ADR if the question
   arises).
5. **`lighthouse-ci-action` (treosh) wrapping `@lhci/cli`.** Considered. The
   action wraps the same `@lhci/cli` with a thinner GitHub-Actions surface (own
   report-formatting helpers, automatic `temporary-public-storage` handling).
   Saves ~15 YAML lines but moves the version pin from `package.json` to a
   GitHub Actions SHA. The `pnpm exec lhci autorun` path keeps the version
   surface auditable alongside every other devDependency.

A PR-comment reporting surface (an `actions/github-script` step upserting a
comment with the report links) was considered and is **out of scope**: the gate
already surfaces its result in the PR status check, the job-summary table, and
the step log, and the owner chose not to add a comment step.

## Decision

Adopt `@lhci/cli` (pinned at exact `0.15.1` as a devDependency in
`package.json`) in a dedicated GitHub Actions workflow
`.github/workflows/lighthouse.yml`, triggered on:

- Pull requests against `main` (every PR, including Renovate and Dependabot —
  mirrors `quality.yml` posture).
- Pushes to `main`.
- A nightly schedule (`cron: '0 3 * * *'` UTC) for trend visibility.

Not triggered on every feature-branch push (only on PR-open against `main`), to
keep CI minutes in check.

### Configuration

LHCI 0.15.1's config loader (`@lhci/utils/src/lighthouserc.js`) flattens any
single config file to **exactly one** `ci.collect`, **one** `ci.assert`, and
**one** `ci.upload` (`flattenRcToConfig` spreads `rc.ci` into one object;
`convertRcFileToYargsOptions` then spreads
`{...ci.assert, ...ci.collect, ...ci.upload}` into one merged options object — a
duplicate `collect` key in the same `ci` object is silently overwritten). The
`assert` step also has no form-factor axis: `assertMatrix` filters by
`matchingUrlPattern` (URL) only. One config file plus one `lhci autorun`
therefore measures and asserts **one** form factor. The Mobile and Desktop form
factors must consequently be **two separate config files**, each run by its own
`autorun`.

`assert.assertions` is a plain object keyed by audit ID (for example
`largest-contentful-paint`, `first-contentful-paint`,
`cumulative-layout-shift`). Each audit ID carries **exactly one** assertion at
**exactly one** level — `'error'`, `'warn'`, or `'off'`. There is no syntax for
two assertion levels on the same audit ID; a second entry for the same key is a
duplicate object key and the first is silently overwritten. A metric is
therefore either an ERROR gate or a WARN gate at any given time, never both. A
metric's mode can change over time (a WARN can be raised to an ERROR via an ADR
amendment that edits the single entry), but it cannot be two modes at once.

The configuration is **three CommonJS files at the repo root**:

- **`lighthouserc.cjs`** — the Mobile config. One `collect` block:
  `staticDistDir: 'dist'`, `numberOfRuns: 3` with median, the canonical 9-URL
  set (below), mobile form factor with default Slow-4G + 4× CPU throttling. One
  `assert` block: `preset: 'lighthouse:no-pwa'` as base plus the Mobile
  category-score and Core Web Vitals overrides per the budget tables below.
  `upload.target: 'temporary-public-storage'`. It `require()`s
  `lighthouserc.shared.cjs` and spreads the four resource-transfer budget
  assertions into its `assert.assertions`.
- **`lighthouserc.desktop.cjs`** — the Desktop config. Same 9-URL set,
  `staticDistDir: 'dist'`, `numberOfRuns: 3` with median; one `collect` block
  using `preset: 'desktop'`. One `assert` block: `preset: 'lighthouse:no-pwa'`
  as base plus the Desktop category-score and Core Web Vitals overrides per the
  budget tables below. `upload.target: 'temporary-public-storage'`. It also
  `require()`s `lighthouserc.shared.cjs` and spreads the same four
  resource-transfer budget assertions into its `assert.assertions`.
- **`lighthouserc.shared.cjs`** — a shared module exporting (via
  `module.exports`) the four worst-of-both resource-transfer budget assertions
  (Total / Script / Image / Font). It is `require()`'d by both form-factor
  configs. The budgets are therefore **defined once but evaluated against both
  form factors' artefacts** — the Mobile `autorun` asserts them against the
  mobile LHRs, the Desktop `autorun` asserts the same thresholds against the
  desktop LHRs.

`preset: 'lighthouse:no-pwa'` is one of the three built-in assert presets
`@lhci/cli@0.15.1` ships (`@lhci/utils/src/presets/{all,no-pwa,recommended}.js`;
`@lhci/utils/src/assertions.js` resolves a `preset:` string by matching
`lighthouse:(.*)$` against that set). It is the correct base for a static
marketing site with no service worker and no web-app manifest: it drops the PWA
audit family while keeping the Performance / Accessibility / Best-Practices /
SEO assertions the project gates on. Each form-factor config layers its own
category-score and Core Web Vitals overrides on top of the preset and merges in
the shared resource-budget assertions.

The canonical 9-URL set, identical in both form-factor configs' `collect.url`:

- `/` (homepage)
- `/services` (catalog)
- `/coaches`
- `/success-stories` (catalog)
- `/how-it-works`
- `/contact`
- `/services/competition-prep` (subscription-arm detail page)
- `/services/posing` (session-arm detail page)
- `/success-stories/sarah-m` (the single success-story detail slug today; the
  audit set grows when more stories ship)

`upload.target: 'temporary-public-storage'` in both form-factor configs gives
anonymous report URLs — 7-day retention on the Google-operated public storage
bucket — printed to the step log of the GitHub Actions run. No LHCI server.

`.cjs` extension is required: the project's `package.json` declares
`"type": "module"`, and `@lhci/cli` 0.15.x's config loader uses synchronous
CommonJS `require()` against the config file. The `.cjs` extension is the
documented escape hatch. The same `require()` is what lets `lighthouserc.cjs`
and `lighthouserc.desktop.cjs` pull in `lighthouserc.shared.cjs` — once Node
`require()`s a config file, that file's own
`require('./lighthouserc.shared.cjs')` resolves by standard CommonJS module
resolution relative to the config file's directory.

The three files are deliberately **non-dotted** (`lighthouserc*.cjs`, not
`.lighthouserc.cjs`): the workflow passes every config via explicit
`--config=<path>`, so LHCI's auto-discovery — which scans a fixed list of dotted
and non-dotted `RC_FILE_NAMES` — is never exercised. With auto-discovery
irrelevant, three consistent sibling names read better than a dotted primary
next to two non-dotted satellites.

### Budgets — Category scores (0-100)

Day-one ERROR thresholds are set against the empirical baseline measured against
`main@08f317b`. Mobile: Lighthouse 12.6.1 via `@lhci/cli@0.15.1`, mobile form
factor, simulate throttling. Desktop: Lighthouse 12.6.1 `desktop-config` preset
(1350×940, desktopDense4G throttling). Both: 1 run per URL, Win11 host, against
the built `dist/`. The Mobile category scores live in `lighthouserc.cjs`'s
`assert` block; the Desktop category scores in `lighthouserc.desktop.cjs`'s
`assert` block.

#### Mobile

| Category       | Day-one (ERROR) | Target (post-baseline)       | Worst-URL baseline    | Rationale                                                                                                                                                                        |
| :------------- | :-------------- | :--------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance    | **85**          | 90 (4-week amendment)        | 86 (`/services/`)     | Baseline-minus-1 floor against per-run flake (±2 points). The 4-week-of-clean-trend amendment lifts the floor to 90. Reachable on this site post-LCP-optimisation follow-up.     |
| Accessibility  | **85**          | 95 (post-a11y-fix amendment) | 89 (`/how-it-works/`) | Two real a11y defects (`color-contrast`, `definition-list`, `dlitem`) pre-existing the gate. Day-one floor accommodates them; the amendment lifts the floor after the fix lands. |
| Best Practices | **95**          | 95                           | 100 (all URLs)        | Comfortable headroom for flake. Lighthouse 12.6.1's `csp-xss` audit is `informative` (weight 0), so no Best-Practices loss from the header-only CSP per ADR-0030.                |
| SEO            | **95**          | 95                           | 100 (all URLs)        | Comfortable headroom for flake. Marketing-site SEO is revenue-relevant; 95 leaves room for occasional canonical-tag quirk on the root index.                                     |

#### Desktop

Reshaped around the measured desktop baseline. The desktop run is fast on
Performance (99–100 on 7 of 9 URLs) but surfaced a **desktop-specific
layout-shift defect** on `/success-stories/` (CLS 0.326, Performance 83) and
`/how-it-works/` (CLS 0.330, Performance 84) — mobile CLS on both is 0.000. That
defect is a follow-up (see § Out of scope); the day-one Desktop Performance and
CLS thresholds are set so they do **not** hard-fail it.

| Category       | Day-one (ERROR) | Target (post-follow-up)      | Worst-URL baseline       | Rationale                                                                                                                                                                                                                                                                                           |
| :------------- | :-------------- | :--------------------------- | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance    | **80**          | 95 (post-desktop-CLS-fix)    | 83 (`/success-stories/`) | The worst desktop URL is 83, dragged down by the desktop-specific CLS defect. 80 is baseline-minus-3 — flake margin plus room for GHA-host divergence on a CLS-loaded score. Lifts to 95 after the desktop-CLS follow-up lands.                                                                     |
| Accessibility  | **85**          | 95 (post-a11y-fix amendment) | 89 (`/how-it-works/`)    | Desktop and mobile share the DOM, so the same two a11y defects produce the same worst-URL scores (89 / 90). A Desktop A11y ERROR of 95 would hard-fail `/how-it-works/` and `/services/competition-prep/` on day one; 85 matches the Mobile A11y floor. Lifts to 95 after the a11y follow-up lands. |
| Best Practices | **95**          | 95                           | 100 (all URLs)           | Comfortable headroom for flake; desktop BP is 100 on every URL.                                                                                                                                                                                                                                     |
| SEO            | **95**          | 95                           | 100 (all URLs)           | Comfortable headroom for flake; desktop SEO is 100 on every URL.                                                                                                                                                                                                                                    |

### Budgets — Core Web Vitals

Core Web Vitals are measured and asserted per form factor — they diverge sharply
(mobile is throttled, desktop is not), and Warrant Check B records the asymmetry
as deliberate. The Mobile CWV assertions live in `lighthouserc.cjs`; the Desktop
CWV assertions in `lighthouserc.desktop.cjs`.

Every Core Web Vital below is a **single asserted threshold at a single level**.
Per § Configuration, `assert.assertions` carries one assertion per audit ID; a
metric is an ERROR gate or a WARN gate, never both at once. The CWV assertions
are **ERROR-only** day-one. Where a column below records a Google "Good" figure,
that figure is a **documented improvement target** — an aspiration recorded to
keep the optimisation goal visible — and is **not a second, WARN-level
assertion**. The improvement path is to tighten the single ERROR threshold
toward the Google "Good" number over time, via an ADR § Status amendment.

#### Mobile (Lighthouse-simulated, Slow-4G + 4× CPU)

| Metric | Day-one ERROR | Google "Good" (improvement target, not asserted) | Worst-URL baseline    | Rationale                                                                                                                                                                                                                                                                                                                 |
| :----- | :------------ | :----------------------------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LCP    | **3500ms**    | 2500ms                                           | 3457ms (`/services/`) | The simulated-throttling lab number runs above field LCP; 3500ms is the baseline-plus-margin ERROR floor — the only asserted threshold. The Google "Good" 2500ms is a documented improvement target, not a WARN assertion; the ERROR floor tightens toward it after the image-LCP optimisation follow-up (ADR amendment). |
| TBT    | **200ms**     | —                                                | 0ms (all URLs)        | Astro SSG ships near-zero JS by default; 200ms is the canary against accidental client-heavy patterns.                                                                                                                                                                                                                    |
| CLS    | **0.1**       | 0.1 (already met)                                | 0.021 (`/services/`)  | Google "Good". Disciplined `width`/`height` on images (ADR-0010 + SmartImage) keeps mobile CLS near zero. (Desktop CLS differs — see below.)                                                                                                                                                                              |
| FCP    | **3000ms**    | 1800ms                                           | 2932ms (`/services/`) | Baseline-plus-margin ERROR floor — the only asserted threshold. The Google "Good" 1800ms is a documented improvement target, not a WARN assertion; the ERROR floor tightens toward it after the follow-up (ADR amendment).                                                                                                |

#### Desktop (Lighthouse `desktop-config` preset, desktopDense4G)

| Metric | Day-one ERROR | Target (post-follow-up)    | Worst-URL baseline       | Rationale                                                                                                                                                                                                                                                                                           |
| :----- | :------------ | :------------------------- | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LCP    | **1500ms**    | —                          | 935ms (`/`)              | Desktop LCP is 566–935ms — an order of magnitude inside Google "Good" (2500ms). A tight 1500ms ERROR floor is defensible because the measured surface is genuinely fast; it is a real canary, not baseline-plus-margin.                                                                             |
| TBT    | **200ms**     | —                          | 0ms (all URLs)           | Desktop TBT is 0ms everywhere; 200ms is the canary against accidental client-heavy patterns.                                                                                                                                                                                                        |
| CLS    | **0.35**      | 0.1 (post-desktop-CLS-fix) | 0.330 (`/how-it-works/`) | Worst desktop CLS is 0.330 — the pre-existing desktop-specific layout-shift defect. A CLS ERROR of 0.1 would hard-fail `/success-stories/` and `/how-it-works/` on day one. 0.35 is set so the gate does not hard-fail the pre-existing defect; lifts to 0.1 after the desktop-CLS follow-up lands. |
| FCP    | **1200ms**    | —                          | 611ms (`/`)              | Desktop FCP is 446–611ms. A tight 1200ms ERROR floor is defensible (the desktop surface is fast) with margin for GHA-host divergence.                                                                                                                                                               |

INP (Interaction to Next Paint, replacing FID as a Core Web Vital in March 2024)
is field-only — Lighthouse Lab cannot measure it. Not part of this budget. A
future RUM source is a separate ADR.

### Budgets — Resource transfers

The four resource-transfer budgets are defined **once** — in
`lighthouserc.shared.cjs` — and `require()`'d into **both** form-factor configs,
where each spreads them into its own `assert.assertions`. They are therefore
**defined once but evaluated against both form factors' artefacts**: the Mobile
`autorun` asserts them against the mobile LHRs, the Desktop `autorun` asserts
the same four thresholds against the desktop LHRs. This is **not** because the
byte counts are identical across form factors — two of the four rows differ
between Mobile and Desktop:

- **`script` and `font` transfer ARE form-factor-identical.** The same `dist/`
  JS and font assets are loaded regardless of viewport; the mobile and desktop
  CSVs carry the same per-URL `script_KB` and `font_KB` figures on all nine
  URLs.
- **`image` and `total` transfer DIFFER between form factors.** Responsive
  images emit `srcset` (via `SmartImage` / Astro `<Image />`), and the 1350px
  desktop viewport pulls larger image candidates than the mobile viewport.
  Worst-URL image transfer is 11KB on mobile (`/`) and 15KB on desktop
  (`/success-stories/`); worst-URL total transfer is 373KB on mobile (`/`,
  `/services/`) and 300KB on desktop (`/success-stories/`). `total` follows
  `image` because it includes image bytes.

Because the same four thresholds are evaluated against both form factors, a
single shared module is strictly stronger than asserting the budgets against one
form factor only: a desktop-image regression (heavier `srcset` candidates at the
wide viewport) could push the desktop image or total transfer up without ever
moving the mobile figure, and a mobile-only assertion would miss it. The Desktop
`autorun` catches exactly that. Each threshold is keyed off the
**worst-of-both-form-factors** baseline — so the asserted threshold covers
whichever form factor pulls the heavier artefact — and a single shared module
keeps the four budgets in exactly one editable place rather than two inline
copies that could drift.

Unlike the Core Web Vitals (ERROR-only day-one), the four resource budgets are
**WARN-mode day-one and flip to ERROR after 4 weeks**. That is a level change
_over time_ — the single assertion entry's level is edited from `'warn'` to
`'error'` via an ADR amendment — not a simultaneous two-level assertion. One
assertion per audit ID holds at every moment.

| Resource        | Day-one (mode) | Post-4-week (mode) | Worst-URL baseline (worst-of-both)  | Rationale                                                                                                                                                                                                                                                                                                           |
| :-------------- | :------------- | :----------------- | :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Total transfer  | 600KB (WARN)   | 600KB (ERROR)      | 373KB (`/`, mobile)                 | Already comfortable; the WARN→ERROR transition after 4 weeks of clean nightly runs locks in the headroom. Mobile worst-URL exceeds desktop worst-URL (300KB on `/success-stories/`), so the worst-of-both figure is the mobile 373KB.                                                                               |
| Script transfer | 150KB (WARN)   | 125KB (ERROR)      | 125KB (`/`)                         | Form-factor-identical (125KB on `/`, both CSVs). Seven of nine URLs exceed the draft's 100KB at baseline. 150KB WARN initially; 125KB ERROR after 4 weeks of trend data.                                                                                                                                            |
| Image transfer  | 400KB (WARN)   | 400KB (ERROR)      | 15KB (`/success-stories/`, desktop) | Vast headroom; WARN-mode preserves room for future hero swaps. ERROR-flip after 4 weeks is conservative. The desktop worst-URL (15KB) exceeds the mobile worst-URL (11KB on `/`) because responsive `srcset` serves larger image candidates at the desktop viewport — the worst-of-both figure is the desktop 15KB. |
| Font transfer   | 100KB (WARN)   | 100KB (ERROR)      | 51KB (all URLs)                     | Form-factor-identical (51KB, both CSVs, every URL). Headroom for a future weight addition.                                                                                                                                                                                                                          |

**Phase-3 implication.** The implementer authors these four assertions in
`lighthouserc.shared.cjs` as a `module.exports`'d assertions fragment, keyed off
the **worst-of-both-form-factors** figure listed above — total 373KB / script
125KB / image 15KB / font 51KB — never the mobile-only figure. Both
`lighthouserc.cjs` and `lighthouserc.desktop.cjs` `require()` that module and
spread it into their `assert.assertions`. Keying off a mobile-only image figure
(11KB) would set a budget marginally tighter than the artefact the desktop audit
actually pulls (15KB). The day-one thresholds (600 / 150 / 400 / 100 KB) already
sit above all four worst-of-both baselines; the worst-of-both figure is the
correct reference so a future budget tightening does not silently desensitise
against the heavier desktop artefact.

The WARN→ERROR escalation on resource budgets is a deliberate two-phase rollout:
the first 4 weeks of nightly runs establish the actual transfer baseline on
`main` against real Renovate-driven dependency jitter; after that window the
gate hardens.

**4-week window — owner decision.** The owner decided the resource-budget
WARN→ERROR window at **4 weeks**. Supporting arithmetic: 4 weeks ≈ 28 nightly
runs; per-run score variance is ±2 points; 28 runs reduce the standard error of
the mean to ±0.4 — tight enough to distinguish trend regression from flake. Two
weeks (14 runs) leaves a ±0.5 standard error and a single bad week distorts the
mean; 8 weeks delays the activation signal past the point where a real
regression PR would surface in pre-baseline noise. The arithmetic supports 4
weeks; the decision is the owner's. (See _Status (post-baseline amendments)_
below for the actual transitions when they happen.)

### Workflow shape (`lighthouse.yml`)

- **Triggers:** `pull_request` against `main`, `push` to `main`, `schedule`
  (`0 3 * * *` UTC), `workflow_dispatch`.
- **Per-job permissions:** the main `lighthouse` job carries `contents: read`
  and `actions: read` (the job-summary and artifact-upload steps need
  `actions: read`); the `lighthouse-status` companion job carries only
  `contents: read`. The job does not write to the pull request — no
  `pull-requests` scope is granted. Sonar rule S8264 / S8233 (per-job
  permissions) is satisfied.
- **Concurrency:**
  `${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}`,
  `cancel-in-progress: true`. Matches the project's existing pattern.
- **Steps:** `actions/checkout@<sha> # v6` (with `fetch-depth: 0` so LHCI has
  git context for run metadata), `corepack enable`,
  `actions/setup-node@<sha> # v6` (with `node-version-file: .nvmrc`,
  `cache: pnpm`, `cache-dependency-path: pnpm-lock.yaml`),
  `pnpm install --frozen-lockfile --prefer-offline`, `pnpm run build`, then
  **two `lhci autorun` invocations —
  `pnpm exec lhci autorun --config=lighthouserc.cjs` (Mobile) followed by
  `pnpm exec lhci autorun --config=lighthouserc.desktop.cjs` (Desktop)** — a
  job-summary table (mirrors the `quality.yml` shape), and an upload of
  `.lighthouseci/` as a GHA artifact (`actions/upload-artifact`, 30-day
  retention).
- **Two `autorun` invocations, one per form factor.** Each config file measures
  and asserts a single form factor (see § Configuration); the Mobile and Desktop
  audits are therefore two sequential `autorun` steps. Both write to the same
  `.lighthouseci/` directory — the second run appends its LHRs — so the single
  `actions/upload-artifact` step captures both form factors' results in one
  artifact.
- **Reporting surfaces.** The gate's result reaches the maintainer through four
  surfaces, none of them a PR comment:
  1. The **PR status check** — pass/fail via the `lighthouse-status` companion
     job, the surface branch protection consumes once the gate is flipped to
     required.
  2. The **job-summary table** rendered in the GitHub Actions run (mirrors the
     `quality.yml` shape).
  3. The **`temporary-public-storage` report URLs** — each `lighthouserc*.cjs`'s
     `upload.target: 'temporary-public-storage'` pushes that form factor's LHRs
     to a Google-operated public bucket (7-day retention) and `lhci autorun`
     prints the resulting one-click report URL to the **step log**.
  4. The **30-day GHA artifact** — the workflow's `actions/upload-artifact` step
     retains the raw `.lighthouseci/` directory (both form factors' LHRs) for
     in-repo inspection after the public bucket expires. Surfaces 3 and 4 are
     not an either/or — the 7-day public URL serves at-a-glance investigation
     from the step log; the 30-day artifact is the durable in-repo copy.
- **Status job:** `lighthouse-status` runs `if: always()` and maps the main
  job's result to a binary pass/fail for branch protection (mirrors
  `quality-status`, `test-status`, `link-check-status`).
- **Branch protection at day one:** **monitor-only.** The `Lighthouse Status`
  job is NOT added to the required-check list at day one. The owner flips it to
  required after 3 consecutive clean nightly runs on `main`. README badge label
  stays `Lighthouse` from day one — operationally invisible to the badge. The
  first-principles defence of the monitor→required design is in § Monitor-only
  at day one — first-principles defence below.
- **Bot PRs run.** Mirrors `quality.yml` (no `actor != renovate[bot]` guard).
  Renovate-bumped deps (Astro, Tailwind, `@astrojs/sitemap`) are the highest
  Performance / bundle-size regression risk; auto-merge without a Lighthouse
  signal would defeat the gate.

### Monitor-only at day one — first-principles defence

The gate ships **monitor-only**: the `Lighthouse Status` companion job is not
added to the branch-protection required-check list at day one, and the owner
flips it to required after **3 consecutive clean nightly runs on `main`**. This
is not borrowed from any prior ADR — it is defended here on first principles:

1. **The introductory PR cannot self-gate honestly.** The day-one thresholds are
   derived from a Win11-host baseline (`benchmarkIndex ≈ 2055`); the first CI
   run on GHA-Ubuntu is the first measurement on the surface the gate will
   actually live on. A required check on the introductory PR would block that PR
   on thresholds no CI-surface measurement has validated — the gate would gate
   its own adoption. Monitor-only breaks the circularity: the introductory PR
   runs Lighthouse, surfaces the CI-surface numbers, and the budgets are tuned
   in the same PR before merge, with no merge-block from an un-CI-validated
   threshold.
2. **3 runs is the smallest sample that distinguishes "stable" from "first-run
   luck".** A single clean nightly run could be flake-favourable; three
   consecutive clean runs on `main` confirm the gate holds across the day-to-day
   jitter of the build (Renovate-driven dependency drift, runner-allocation
   variance) before it gains merge-blocking authority. More than 3 delays
   activation without adding signal — by run 3 the variance band is already
   visible.
3. **The flip is a deliberate, recorded step.** The branch-protection flip
   requires GitHub UI access (it is not expressible in repo files). It is
   recorded as a dated checklist item in `docs/MAINTENANCE.md` (see §
   Documentation Updates) so the most likely failure mode of a monitor-only gate
   — nobody ever flips it — is caught by a tickable artefact rather than tribal
   memory.

### Failure strategy summary

| Layer                                                       | Mode                                | Blocks at                                              |
| :---------------------------------------------------------- | :---------------------------------- | :----------------------------------------------------- |
| Category scores (Performance / A11y / Best Practices / SEO) | ERROR                               | Day one                                                |
| Core Web Vitals (LCP / TBT / CLS / FCP), Mobile and Desktop | ERROR (single threshold per metric) | Day one                                                |
| Resource transfer budgets (Total / Script / Image / Font)   | WARN day-one, ERROR after 4 weeks   | After 4 weeks of clean nightly runs (ADR amendment)    |
| Branch-protection required check                            | Not enforced at day one             | After 3 consecutive clean nightly runs (owner-flipped) |

Core Web Vitals and category scores are **ERROR-mode at day one** — each is a
single asserted threshold per metric, no WARN level. The Google "Good" LCP/FCP
figures recorded in § Budgets — Core Web Vitals are documented improvement
targets, not asserted WARN entries. WARN mode is used **only** for the four
resource-transfer budgets, where the project-specific baseline needs 4 weeks of
nightly trend data before it can block; after that window the single resource
assertion's level is edited from `'warn'` to `'error'` via an ADR amendment.
Category scores have stable Lighthouse-version semantics and the day-one
threshold is the baseline-plus-margin floor (or, for Desktop Performance and
CLS, the floor set below the pre-existing desktop-CLS defect), ERROR-mode
immediately.

### Renovate strategy

`renovate.json` gains a `packageRules` entry:

```json
{
  "description": "Lighthouse CI manual-review (transitive lighthouse version drift)",
  "matchPackageNames": ["@lhci/cli"],
  "automerge": false,
  "labels": ["lighthouse-ci"]
}
```

Rationale: `@lhci/cli` carries `lighthouse` as a transitive dependency (at the
time of this ADR, `lighthouse@12.6.1`). A `@lhci/cli` patch bump that pulls in a
`lighthouse` minor can shift scoring weights between audit categories (Google
adjusts Lighthouse scoring weights between minor versions). With day-one
ERROR-mode gates, that drift would surface as a sudden CI block on an unrelated
PR. The manual-review lane makes every Lighthouse upgrade a deliberate PR with
the audit signal visible in the PR itself.

### Verification of OQ6 (`csp-xss` audit)

Verified empirically against `@lhci/cli@0.15.1` shipping `lighthouse@12.6.1`. In
every LHR produced against the 9-URL set, on both form factors:

- `audits.csp-xss.score = 1`
- `audits.csp-xss.scoreDisplayMode = "informative"`
- `categories.best-practices.auditRefs` includes `csp-xss` with `weight: 0`.

**The audit is present but not scored.** It does not affect the Best-Practices
category total. **No assertion override is required** in either form-factor
config. This contradicts the OQ6 contingency (which planned a `'csp-xss': 'off'`
override entry); the contingency is dropped. The CSP strategy in ADR-0030
(header-applied via `netlify.toml`, not `<meta>`) remains unaffected by
Lighthouse.

If a future Lighthouse minor bump rescores `csp-xss` (weight > 0), the
manual-review Renovate lane surfaces the change in the upgrade PR and the
override can be added at that time. The verification step is recorded in
`MAINTENANCE.md` as part of the Lighthouse CI subsection.

### What does NOT change

- `quality.yml`, `tests.yml`, `semgrep.yml`, `links.yml`, `csp-drift.yml` are
  unmodified. The new workflow is parallel, not embedded.
- The CSP hash strategy (ADR-0030) is unaffected. LHCI's static server inherits
  the post-build hashes; the `csp-drift.yml` workflow continues to verify the
  committed `netlify.toml` matches the build. LHCI's static server does not
  replay `netlify.toml` headers — the audit runs against `dist/` without the
  production CSP applied. This is correct: CSP is a runtime-enforcement layer,
  not a content-of-build layer.
- The pre-push gate sequence (`pnpm format` → `pnpm check` → reviewer agent →
  push) is unchanged. Lighthouse runs in CI only; the wall-clock cost of a full
  `pnpm build` plus three Lighthouse runs on two form factors would shift the
  gate from "fast enough to run every time" to "frequently skipped".
- Netlify's own build pipeline and deploy-preview behaviour are untouched.
  Lighthouse is GitHub-Actions-local.
- Component-level a11y (ADR-0052, in flight) continues to cover per-component
  regressions at unit-test time.
- Branch protection's existing required checks (`Quality Status`, `Test Status`,
  `Link Check Status`) are unchanged. `Lighthouse Status` is NOT added until the
  activation gate (3 clean nightly runs).

### Scope and non-goals

**In scope:** Lighthouse audits of the 9 URLs above. Mobile and Desktop
separately, with separate budgets and separate config files. Reporting via the
PR status check, the job-summary table, and `temporary-public-storage` report
URLs in the step log. Nightly trend visibility. Renovate manual-review lane for
`@lhci/cli`.

**Out of scope:** LHCI server self-hosting. RUM / field-data Core Web Vitals /
INP. Lighthouse-on-deploy-preview. E2E user-flow performance tests
(Playwright/Puppeteer territory). A PR-comment reporting step — the gate's
result is surfaced through the PR status check, the job-summary table, and the
step log; the owner chose not to add a comment step. SonarCloud quality-gate
integration (independent quality lane). Modifications to existing workflows.
Adding Lighthouse to the local Pre-Push Gate. Removing the existing README badge
block structure. Audit of `/privacy`, `/terms`, `/contact/thanks` (legal
content, low-change, owner-reviewed when it changes).

**Defects surfaced by the baseline — follow-ups, not part of this ADR.** The
baseline measurement surfaced three pre-existing defects. None is fixed by this
ADR; each is a separate stream that lands via a fresh Phase 1 → 2 → 3, not a
drive-by fix inside the introducing PR. The Lighthouse gate's day-one thresholds
are set so the introductory PR's own run does not red on any of them:

1. **`color-contrast` a11y defect** — widespread across pages; drives several
   mobile and desktop A11y scores into the 96 band.
2. **`definition-list` / `dlitem` a11y defect** — on `/how-it-works/` and
   `/services/competition-prep/`; drives those two URLs to the 89 / 90 A11y
   worst-URL scores on both form factors (shared DOM).
3. **Desktop-specific layout-shift defect** — on `/success-stories/` (desktop
   CLS 0.326) and `/how-it-works/` (desktop CLS 0.330), dragging desktop
   Performance to 83 / 84. Mobile CLS on both is 0.000; the defect is
   desktop-viewport-only and was missed by the initial mobile-only baseline.
   Likely a desktop layout branch (a grid or hero that reflows at the wider
   viewport). The day-one Desktop Performance ERROR (80) and Desktop CLS ERROR
   (0.35) are set below/above this defect so it does not hard-fail the
   introductory PR; both thresholds lift after the follow-up lands.

## Consequences

### Positive

- Performance, page-level a11y, best practices, and SEO regressions are caught
  on PR, before reaching production. The "image swap doubles LCP" scenario
  surfaces in CI rather than in field traffic.
- Mobile and Desktop are evaluated against appropriate budgets; mobile is not
  sandbagged by a unified threshold and desktop is not over-throttled. The
  two-config-file split makes the asymmetry structurally explicit — each form
  factor's thresholds live in their own file.
- Anonymous report URLs printed to the step log make it cheap to investigate a
  regression — one click from the step log to the full Lighthouse report.
- Nightly trend visibility surfaces slow drift (gradual image bloat, slow CWV
  erosion) that PR-level audits can miss in isolation.
- The monitor-only-then-required activation prevents introductory-PR-suicide:
  the first PR runs Lighthouse but does not gate the merge while the CI-surface
  budgets are still being validated.
- The baseline-defended budgets mean the introductory PR's own Lighthouse run is
  expected to pass the assertions (subject to one planned budget-tuning
  iteration for GHA-host divergence — see § Risk mitigation and the concept
  doc's Open Assumption D) — the budgets were measured before being locked, not
  adopted unmeasured.
- The resource-transfer budgets, factored into a single shared module
  `require()`'d by both form-factor configs, are evaluated against both the
  mobile and the desktop artefacts — catching a desktop-image regression a
  mobile-only assertion would miss.

### Negative

- CI minutes consumption increases — Lighthouse is the slowest job in the
  project at 3-5 minutes per PR run, twice that per nightly run (Mobile +
  Desktop). Acceptable cost for the failure modes it catches. The cost is
  bounded: GitHub Actions free-tier for public repositories is unlimited, and
  the project is public.
- Initial baselining of the resource budgets requires 4 weeks of nightly runs
  before they can block. The WARN phase is real exposure during that window — a
  script-size regression in week 2 of activation is visible (job summary + step
  log) but does not block merge.
- Lighthouse Lab is simulated, not real-user. Field-data discrepancies are not
  captured; INP is not measured. The gate is "no worse than the baseline"
  against a lab proxy, not against the user's experience.
- Score volatility: Lighthouse scores fluctuate ±2 points run-to-run; the
  `numberOfRuns: 3` with median is the standard mitigation but does not
  eliminate volatility entirely. The day-one Performance thresholds (85 mobile,
  80 desktop) carry this in mind — baseline-minus-margin floors rather than
  baseline-equal.
- The day-one Desktop Performance (80) and Desktop CLS (0.35) thresholds are
  deliberately loosened around the pre-existing desktop-CLS defect. Until the
  desktop-CLS follow-up lands and the thresholds lift, the gate is desensitised
  against a new desktop-performance regression on `/success-stories/` and
  `/how-it-works/`. The loosening is bounded to the follow-up's lifetime and
  recorded in § Status (post-baseline amendments).
- `temporary-public-storage` uploads anonymous LHRs to a Google-operated public
  bucket with 7-day retention. For a public marketing repo with no PII surface
  this is acceptable; the trade-off is documented for future revisit.
- The `csp-xss` audit (Lighthouse 12.6.1: informative-only, weight 0) could be
  rescored in a future Lighthouse minor. The manual-review Renovate lane catches
  that; if missed, a CI failure on an unrelated PR is the symptom and the
  override-or-fix decision lands in that PR.
- The three-file config split shares a small set of scalar/array values
  (`collect.url`, `staticDistDir`, `numberOfRuns`) between `lighthouserc.cjs`
  and `lighthouserc.desktop.cjs` that could drift. The drift surface is bounded
  — the most edit-prone and most consequential values, the four resource
  budgets, are factored into `lighthouserc.shared.cjs` and cannot drift; the
  remaining shared values are write-once, read-rarely. This is the accepted cost
  of a config shape the LHCI 0.15.1 loader can actually run (a single config
  file flattens to one form factor only).

### Risk mitigation

- **Three runs with median selection** mitigates score volatility, and also
  produces a 3-run median for the desktop-CLS defect on the introductory PR —
  confirming (or refuting) the single-run desktop baseline reading within the
  introducing PR.
- **Dedicated workflow** isolates Lighthouse failures from the fast lanes; a
  Lighthouse-only outage does not block other CI signals.
- **Monitor-only at day one** + **3-clean-nightly-runs activation gate**
  prevents introductory-PR-suicide.
- **WARN-mode resource budgets** during the 4-week activation window prevent
  false-positive blocks during baseline establishment.
- **Renovate manual-review lane for `@lhci/cli`** surfaces Lighthouse upgrades
  as PRs with the audit signal visible.
- **Baseline-defended budgets** mean every threshold is anchored to a measured
  worst-URL number, not aspirational. One budget-tuning iteration on the
  introductory PR is the planned path for GHA-Ubuntu vs. Win11-host divergence,
  not a contingency.

## Success criteria

- The `.github/workflows/lighthouse.yml` workflow runs on every PR against
  `main` and produces a check result (green, or a WARN-mode finding in the job
  summary, or — on the introductory PR — a budget-tuning iteration) for the
  baseline state of `main`.
- Three consecutive clean nightly runs on `main` allow the owner to flip
  `Lighthouse Status` into the branch-protection required-check list.
- Four weeks of clean nightly runs after activation allow the WARN-mode resource
  budgets to flip to ERROR mode (ADR amendment).
- The follow-up a11y stream (separately scoped) reduces the worst-URL
  Accessibility score to 95+, allowing the ADR's Accessibility thresholds
  (mobile and desktop) to lift from 85 to 95.
- The follow-up desktop-CLS stream (separately scoped) reduces the desktop CLS
  on `/success-stories/` and `/how-it-works/` to ≤ 0.1, allowing the Desktop
  Performance threshold to lift from 80 to 95 and the Desktop CLS threshold from
  0.35 to 0.1.

## Documentation Updates

The following land in the same commit series as this ADR (Phase-3 Commit 4):

- `docs/ARCHITECTURE.md#adr-quick-reference` — append:
  `| 0053 | Performance / quality gates (Lighthouse CI) | Accepted | <Key Insight> |`.
  The Key Insight: "PR + nightly Lighthouse on 9 URLs, baseline-defended
  Mobile + Desktop budgets, monitor→required after 3 clean nightly runs,
  WARN→ERROR resource budgets after 4 weeks."
- `docs/ARCHITECTURE.md#cicd-pipeline` — add a "Performance and Quality Gates"
  pointer paragraph after the existing mermaid graph, cross-referencing
  `lighthouse.yml` and this ADR's budget tables.
- `docs/MAINTENANCE.md#automated-quality-checks` — add a "Lighthouse CI"
  subsection naming the triggers, the budget-change procedure (= this ADR's
  amendment), the WARN→ERROR transition (4 weeks of clean nightly runs), the
  monitor→required transition (3 consecutive clean nightly runs), the `csp-xss`
  verification step, the two report-retention mechanisms
  (`temporary-public-storage` 7-day Google bucket + `actions/upload-artifact`
  30-day GHA artifact), and a **dated branch-protection-flip checklist item** —
  a tickable operational step ("after 3 consecutive clean nightly runs on
  `main`, add `Lighthouse Status` to the branch-protection required-check list;
  date: \_\_\_\_"). The checklist item is the structural guard against the most
  likely monitor-only failure mode (the flip never happens).
- `CLAUDE.md#conventions-quick-reference` — add the bullet:
  `**Performance / quality gates** — Lighthouse CI on PRs and nightly; budgets in ADR-0053.`
- `README.md` (badge row at L3-L6) — add a 5th badge for the Lighthouse
  workflow.

`docs/CONVENTIONS.md`, `docs/AGENTS.md`, and `CONTRIBUTING.md` are intentionally
**not** updated: Lighthouse is a CI-side gate, not an edit-time coding pattern
(`docs/CONVENTIONS.md`), nor an agent-collaboration-architecture change
(`docs/AGENTS.md`), nor a commit/branch/PR-workflow change (`CONTRIBUTING.md`).
`CLAUDE.md` **is** updated, because its § Conventions Quick Reference is the
single index a future orchestrator or implementer scans to learn which
merge-gating CI lanes exist; a new gate belongs in that index. (This is decided
on the index-completeness argument, on its own merits.)

## References

- ADR-0010 — SmartImage + ImageSource (CLS discipline).
- ADR-0022 — Hybrid rendering model (the Astro SSG default that keeps TBT near
  zero).
- ADR-0030 — CSP hash strategy (interaction with Lighthouse's static server;
  `csp-xss` audit verification).
- ADR-0034 — Extract-first for AI-assisted development (the structural principle
  behind the AI-first decision driver).
- ADR-0052 — Component-level accessibility testing with axe-core (complementary
  a11y layer at unit-test time; this ADR is the page-level layer).
- `@lhci/cli` configuration —
  https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
- Web Vitals thresholds — https://web.dev/vitals/

## Status (post-baseline amendments)

This section is reserved for the three baseline-driven amendments, each landing
as its own separate commit (not a drive-by edit), each recording the transition
date and the nightly-run trend (or follow-up PR) that justified it:

1. **WARN→ERROR resource-budget flip** — scheduled 4 weeks after activation.
   Flips Total / Script / Image / Font transfer budgets from WARN to ERROR
   (Script also tightens from 150KB to 125KB). The four budgets live in
   `lighthouserc.shared.cjs`; the flip is a single-file edit that changes each
   assertion entry's level from `'warn'` to `'error'`.
2. **Accessibility-threshold lift to 95** — after the a11y follow-up stream
   (`color-contrast`, `definition-list` / `dlitem`) lands and the worst-URL A11y
   score reaches 95+. Lifts both the Mobile Accessibility threshold (in
   `lighthouserc.cjs`) and the Desktop Accessibility threshold (in
   `lighthouserc.desktop.cjs`) from 85 to 95.
3. **Desktop Performance / CLS lift, and Mobile LCP/FCP ERROR-threshold
   tightening** — two related tightenings. (a) After the desktop-CLS follow-up
   stream lands and the desktop CLS on `/success-stories/` and `/how-it-works/`
   reaches ≤ 0.1, lift the Desktop Performance ERROR threshold from 80 to 95 and
   the Desktop CLS ERROR threshold from 0.35 to 0.1 (both in
   `lighthouserc.desktop.cjs`). (b) After the image-LCP optimisation follow-up
   lands, tighten the **Mobile** LCP ERROR threshold toward the Google "Good"
   2500ms and the Mobile FCP ERROR threshold toward 1800ms (both in
   `lighthouserc.cjs`). The Core Web Vitals carry no WARN assertion to "lift" —
   they are ERROR-only — so the improvement is a tightening of the single
   existing ERROR entry, recorded here with the follow-up PR that justified it.
