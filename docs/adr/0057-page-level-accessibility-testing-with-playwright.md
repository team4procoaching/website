# Page-Level Accessibility Testing with Playwright and the Pinned axe-core

Date: 2026-05-26

## ADR Warrant Check

- [x] **A — Contract:** every page in the canonical 9-URL set is scanned by
      `axe-core@4.11.4` against its real-browser render on Mobile and Desktop
      viewports, and four interactive states (Modal open, MobileMenu open,
      focus-trap, focus-return) are scanned in the same realm; CI fails on any
      WCAG 2.1 AA violation. The page-layer rule baseline re-enables the eight
      document-composition rules ADR-0052 disables as fragment artefacts.
- [x] **B — Asymmetry:** the page layer and the component-fragment layer use the
      **same** pinned `axe-core@4.11.4` but **inverse** rule baselines.
      Component fragments disable document-composition rules (no `<html>`, no
      `<main>`, no `<title>` in a fragment); pages re-enable them (the page
      genuinely has one). A future "harmonising" PR that unified the two rule
      sets would be a regression — the inversion is the design.
- [x] **C — External revisit:** revisit if (a) Playwright is adopted for other
      purposes (E2E, visual regression) — a separate ADR records that; (b)
      `axe-core` 4.x sunsets and the project moves to a different a11y engine —
      both layers move together; (c) a third realm becomes relevant (e.g.
      shadow-DOM-isolation scans for a future Web Component under test) — extend
      the per-layer convention to a third call site.

## Status

Accepted

## Context

ADR-0052 established component-fragment accessibility testing with
`axe-core@4.11.4` over Astro Container API renders in a JSDOM realm. That layer
is structurally blind to three classes of defect: document-composition rules
that assume a full page (and are therefore disabled in the ADR-0052 baseline —
`region`, `landmark-one-main`, `page-has-heading-one`, `html-has-lang`,
`html-lang-valid`, `bypass`, `document-title`, `meta-viewport`);
layout-dependent rules that need a real rendering engine (`color-contrast`,
`display: contents` resolution, target size, practical focus order); and the
accessibility of interactive states reachable only in a real browser (open
Modal, open MobileMenu, focus-trap inside open dialogs, focus-return on close).

ADR-0053 introduced a Lighthouse CI gate whose `categories:accessibility`
assertion covered page-level a11y in a real browser as an **interim** measure.
Lighthouse 12.6.1 bundles its own transitive `axe-core`, independent of the
pinned 4.11.4 sanctioned in ADR-0052. Relying on Lighthouse for page-layer a11y
long-term means two axe versions with two rule sets gating the same codebase — a
finding that the component-layer pin would flag (or suppress) can carry the
opposite verdict at the page layer.

The project's a11y findings from the first Lighthouse CI run on `main`
([ADR-0053](0053-performance-and-quality-gates-with-lighthouse-ci.md) § Defects
surfaced by the first CI run) confirm that real-browser, layout-aware scanning
catches defects the component layer cannot: a `color-contrast` violation on
every URL and a `definition-list` / `dlitem` violation on `/how-it-works/` and
`/services/competition-prep/`. The component-layer Accordion test at
`src/components/ui/accordion.test.ts` already disables `definition-list` and
`dlitem` and calls the disable a "JSDOM-only false positive" produced by
`<el-disclosure>`'s `display: contents`, deferring the real check to the page
level. The two statements are in tension; the project has no scanner today that
can settle the contradiction.

### Decision drivers

- **Single axe oracle across layers.** The component-layer pin
  (`axe-core@4.11.4`) is the project's chosen authority for the a11y rule set,
  scoring, and the per-rule baseline. A second, independently-drifting
  transitive — Lighthouse's bundled axe, or `@axe-core/playwright`'s bundled axe
  — reintroduces the two-rule-set problem the layering was designed to avoid.
- **Interactive-state a11y.** Modal-open, MobileMenu-open, focus-trap, and
  focus-return are the highest-risk a11y surfaces on a marketing site optimised
  for mobile traffic. None is exercised by either ADR-0052's JSDOM-fragment
  renders or ADR-0053's Lighthouse default-page audits.
- **AI-first working mode.** The project optimises for structural enforcement
  over per-contributor discipline. A "verify the transitive at every Renovate
  bump" rule is discipline; an "import the same `axe-core` package as the other
  layer" rule is structure. The Route A decision below applies the same warrant
  ADR-0052 applied when rejecting `vitest-axe` for `axe.source`-into-realm
  injection.
- **CI laneing.** Playwright is the slow build-and-browser-driver lane; it must
  not couple with `quality.yml` (fast source-level) or `tests.yml` (Vitest
  unit). A dedicated workflow mirroring `lighthouse.yml`'s shape isolates it.
- **Bus-Factor.** The single-pinned-`axe-core@4.11.4` invariant is one of the
  load-bearing properties of the a11y programme. Documenting it in a separate
  ADR (this one) — rather than as a paragraph under ADR-0052 or ADR-0053 — makes
  the invariant a discoverable architectural fact, not a detail buried in
  another ADR's body.

### Evaluated approaches

1. **Inject the pinned `axe-core` source into the Playwright page realm via
   `page.addScriptTag`.** A page-level helper at `src/test-utils/a11yPage.ts`
   resolves `node_modules/axe-core/axe.min.js` via `require.resolve` (or the
   ESM-context equivalent), injects it into the page realm with
   `page.addScriptTag({ path: ... })`, and runs `axe.run` inside that realm via
   `page.evaluate`. **Chosen.** True single-version invariant by construction —
   the helper imports the same `axe-core` package the component layer does, so a
   future bump moves both layers in one `package.json` edit. No new dependency
   whose bundled axe drifts. No per-contributor verification ritual at Renovate
   time. Structural mirror of ADR-0052's `axe.source`-into-realm pattern; a
   future maintainer reading one file recognises the other.

2. **Adopt `@axe-core/playwright` and constrain its transitive `axe-core` to
   4.11.4.** Add the community wrapper; verify the transitive at install time;
   pin it via `pnpm.overrides`; add a second Renovate manual-review lane so a
   transitive bump surfaces as a deliberate PR. **Rejected.** The single-version
   invariant is held by a multi-step manual policy (override audit + Renovate
   lane), not by construction; same class of reason ADR-0052 rejected
   `vitest-axe` for. The wrapper's API ergonomics
   (`new AxeBuilder({ page }).analyze()`) do not compensate for the recurring
   `pnpm.overrides` audit at every wrapper bump. The `@axe-core/playwright`
   package is **not** added.

3. **Extend the ADR-0052 JSDOM helper to full pages.** Read the built
   `dist/<route>/index.html` files and run `expectNoA11yViolations` against them
   with the document-composition rules re-enabled. **Rejected.** JSDOM has no
   layout engine, so `color-contrast` remains effectively disabled (no
   `getComputedStyle` for color tokens), the Accordion `display: contents`
   resolution stays broken (the OQ6 contradiction is unresolvable), and Modal /
   MobileMenu cannot be driven by user input. Fails three of the load-bearing
   properties this ADR is meant to deliver.

4. **Lighthouse owns page-level a11y permanently.** Keep the
   `categories:accessibility` assertion in `lighthouserc.cjs` /
   `lighthouserc.desktop.cjs`; remove it never. **Rejected.** Two axe versions
   and two rule sets gating the same project; no per-rule control aligned with
   the component-layer baseline; no ability to drive into interactive states.
   The `categories:accessibility` assertion is the right _interim_ page-level
   a11y detector until ADR-0057 is promoted to required, then it is superseded.

5. **Stay at the component layer only.** **Rejected.** Structurally blind to
   document-composition rules, all layout-dependent rules including contrast,
   and all interactive states.

## Decision

Adopt Playwright as the page-level accessibility test surface. Page scans run
`axe-core@4.11.4` — the same pinned version the component layer uses — against
the real rendered DOM of every route in the canonical 9-URL set, across Mobile
and Desktop viewports, and against four interactive states (Modal open,
MobileMenu open, focus-trap, focus-return).

The single-version invariant is mandatory: **all axe execution in the project
resolves to the one pinned `axe-core@4.11.4`.** The page scanner introduces no
second, independently-drifting axe version. The chosen implementation is
**inject the pinned `axe-core` source via `page.addScriptTag` and run axe inside
the page realm via `page.evaluate`** — the page-layer mirror of ADR-0052's
JSDOM-realm- injection pattern.

This decision **supersedes the Accessibility category of ADR-0053's Lighthouse
gate** while leaving the rest of ADR-0053 (Performance, Core Web Vitals, SEO,
Best-Practices, the budget regime, the monitor-only → required rollout, the
resource budgets) fully in force. Under the repo's immutable-ADR model the
supersession is expressed as a directed foot cross-reference on ADR-0053, not as
a status change or body edit.

This decision **extends ADR-0052** from the component layer to the page layer.
Together, ADR-0052 and ADR-0057 own the project's accessibility- testing topic
complex, sharing the pinned `axe-core@4.11.4` across the two layers.

### Scope and non-goals

**In scope:**

- A new `src/test-utils/a11yPage.ts` page-layer a11y helper —
  `expectPageNoA11yViolations(page: Page, options?)` — that injects the pinned
  `axe-core@4.11.4`'s `axe.min.js` into a Playwright page realm and asserts no
  WCAG 2.1 AA violations.
- Page scans across the canonical 9-URL set: `/`, `/services`, `/coaches`,
  `/success-stories`, `/how-it-works`, `/contact`, `/services/competition-prep`,
  `/services/posing`, `/success-stories/sarah-m`. Both Mobile and Desktop
  viewports (18 scans per default-render pass). The two `<Accordion>`-bearing
  routes (`/how-it-works`, `/services/competition-prep`) settle the OQ6
  contradiction inline under the same WCAG 2.1 AA tag set as the rest of the
  scans — no separate diagnostic spec file ships.
- Interactive-state scans at day one: Modal (open), MobileMenu (open),
  focus-trap within open dialogs, focus-return on close.
- A new `.github/workflows/playwright-a11y.yml` workflow mirroring
  `lighthouse.yml`'s three-job shape (path-filter pre-job, audit job,
  always-running status job). Status job named exactly `Playwright A11y Status`.
  Per-job least-privilege permissions. SHA-pinned action references (reused from
  `lighthouse.yml`).
- Playwright as an exact-pinned `devDependency` (`playwright@1.60.0`).
- A Renovate `packageRules` entry for `playwright` mirroring the `@lhci/cli`
  manual-review lane (`automerge: false`).
- The rule set re-enables the eight document-composition rules ADR-0052 disables
  as fragment artefacts (`region`, `landmark-one-main`, `page-has-heading-one`,
  `html-has-lang`, `html-lang-valid`, `bypass`, `document-title`,
  `meta-viewport`).

**Out of scope:**

- End-to-end / functional / visual-regression Playwright testing. Playwright is
  scoped to accessibility only in this stream; if Playwright is adopted for
  unrelated reasons later, a separate ADR records that.
- Adoption of `@axe-core/playwright`. Approach 2 above is rejected.
- Removing the `categories:accessibility` assertion from `lighthouserc.cjs` /
  `lighthouserc.desktop.cjs`. Gated on promotion of this gate to required (see §
  Activation). This branch documents the removal procedure in
  `docs/MAINTENANCE.md` § Playwright A11y; the removal itself is a separate
  future config-only PR.
- Edits to ADR-0052's or ADR-0053's body. Both ADRs are accepted and immutable
  under the repo's ADR-lifecycle model. The supersession of ADR-0053's
  Accessibility category and the extension of ADR-0052 to the page layer are
  expressed as directed cross-references; the `src/test-utils/a11y.ts` JSDoc
  call-site phrasing is a code-side edit, not an ADR-0052 body change.
- A new Critical Rule in `CLAUDE.md` § Critical Rules. Per ADR-0052 § Decision
  point 5's reasoning, a test-presence convention belongs in
  `docs/CONVENTIONS.md` and the Conventions Quick Reference, not in the
  code-shape / runtime / security Critical Rules list.
- Fixing the ADR-0053-baseline a11y follow-ups (`color-contrast`,
  `definition-list` / `dlitem` on the page-level finding). They are linked
  tracked follow-ups, not part of this stream.
- The wider interactive-state surface (QuizModal step-by-step, ServicesFilter
  post-filter, SessionConfigurator post-configuration, ContactForm prefill
  branches, broader Accordion expand-state). Deferred via one
  `docs/debt/REGISTER.md` entry (DEBT-260526-01) the stream files in its own
  commit.
- A new field-data / RUM source for INP or other interaction metrics. Same
  scope-fence as ADR-0053.

### What does NOT change

- The existing component-layer a11y tests and their assertions remain.
  `src/test-utils/a11y.ts` (the component-layer helper) is unchanged in code;
  only its JSDoc call-site phrasing is amended to read "one of two sanctioned
  `axe-core` call sites" (the page layer is this ADR's helper at
  `src/test-utils/a11yPage.ts`).
- ADR-0037's Container-API pattern, ADR-0052's rule baseline, and the Critical
  Rule set are unchanged.
- ADR-0053's Lighthouse gate continues to run as configured. The
  `categories:accessibility` assertion is the interim page-level a11y detector
  until this ADR is promoted to required; at that point the assertion is removed
  from `lighthouserc.cjs` and `lighthouserc.desktop.cjs` via the documented
  procedure in `docs/MAINTENANCE.md` § Playwright A11y.
- The CSP strategy (ADR-0030) is unaffected. Playwright runs against a
  static-served `dist/` (analogous to LHCI's static server) and does not
  exercise Netlify's production CSP headers; a separate page-level CSP
  behavioural check is not in scope.
- The pre-push Gate sequence is unchanged. Playwright A11y runs in CI only, not
  as part of `pnpm check` and not in the pre-push reviewer step.

## Implementation

### The page-layer helper

`src/test-utils/a11yPage.ts` exports:

```ts
async function expectPageNoA11yViolations(
  page: Page,
  options?: { disableRules?: readonly string[] },
): Promise<void>;
```

The helper's contract:

1. Resolves the path to the pinned `axe-core@4.11.4`'s `axe.min.js` via
   `require.resolve('axe-core/axe.min.js')` (or the ESM-context equivalent —
   `fileURLToPath(import.meta.resolve('axe-core/axe.min.js'))` under
   `"type": "module"`). The resolution is single-pinned-version by construction
   — the resolved file is the same `node_modules/axe-core/axe.min.js` the
   component layer's `import axe from 'axe-core'` reads `axe.source` from.
2. `await page.addScriptTag({ path: <resolved axe.min.js path> })` — Playwright
   injects the file's contents as a `<script>` into the page realm. The page
   realm now owns a `window.axe` bound to the page's own `Node` / `Element`
   constructors.
3. `await page.evaluate((opts) => window.axe.run(document, opts), runOptions)` —
   axe runs inside the page realm against the live document, returning a
   serialised `AxeResults` to Node.
4. Asserts `results.violations.length === 0`. Any violation is formatted through
   the same `formatViolations` shape ADR-0052's helper uses — rule id, help URL,
   failing-element snippet.

The helper bakes in the WCAG 2.1 AA tag set (`wcag2a`, `wcag2aa`, `wcag21a`,
`wcag21aa`) — identical to the component layer. The fragment-rendering baseline
is **inverted**: the eight rules ADR-0052 disables (`region`,
`landmark-one-main`, `page-has-heading-one`, `html-has-lang`, `html-lang-valid`,
`bypass`, `document-title`, `meta-viewport`) are **re-enabled** at the page
layer — they are legitimate against a full document. Per-call `disableRules`
extend the empty page-layer baseline.

### The single-pinned-axe-core invariant

The grep-decidable invariant in the codebase becomes:

```
rg "axe-core" src/
```

resolves to **exactly two files**: `src/test-utils/a11y.ts` (component-fragment
layer) and `src/test-utils/a11yPage.ts` (page layer). Both import the same
`axe-core` package. A future `axe-core` bump is one `package.json` edit and the
lockfile reflection; both layers move together by construction. The convention
amendment in `docs/CONVENTIONS.md` § Testing Conventions records "one sanctioned
`axe-core` call site **per layer**" — the open-layering wording leaves room for
a future third realm (e.g. shadow-DOM-isolation) but currently admits exactly
two.

### The CI workflow

`.github/workflows/playwright-a11y.yml` mirrors `lighthouse.yml`'s shape
exactly. The reuse is deliberate — same path-filter pre-job pattern, same
status-companion job pattern, same per-job least-privilege permission profile,
same SHA-pinned action references.

- **`changes` pre-job** — path-filter via `dorny/paths-filter` SHA-pinned to the
  same digest `lighthouse.yml` uses
  (`de90cc6fb38fc0963ad72b210f1f284cd68cea36 # v3.0.2`), with
  `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6` at
  `fetch-depth: 0` (so the `git`-diff mode can reach the PR base ref). The path
  list covers `src/**`, `public/**`, `astro.config.mjs`, `.nvmrc`,
  `tsconfig.json`, the helper file (`src/test-utils/a11yPage.ts`), the
  Playwright config (`playwright.config.ts`), the spec files (`tests/a11y/**`),
  and the workflow file itself. Unlike Lighthouse's path list, `package.json`
  and `pnpm-lock.yaml` are **not** in this list — a dependency bump can change
  Playwright's behaviour, but the Renovate manual-review lane for `playwright`
  (and, where engaged, the parallel lane for `axe-core` itself) already routes
  every behaviour-affecting update through a deliberate PR.
- **`playwright-a11y` audit job** — conditional on
  `needs.changes.outputs.perf-relevant == 'true'`. Builds the site, installs
  Playwright browsers (`pnpm exec playwright install --with-deps chromium`),
  runs `pnpm exec playwright test` against the static-served `dist/`. Reports
  via the GHA job-summary table and uploads the Playwright HTML report and trace
  artefacts as a 30-day GHA artifact via
  `actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6`.
- **`playwright-a11y-status` job** — `needs: [changes, playwright-a11y]`,
  `if: always()`, name `Playwright A11y Status`. The outcome contract mirrors
  `lighthouse-status`'s shape verbatim — GREEN when the audit ran and passed,
  GREEN when the `changes` job succeeded and reported no perf-relevant change
  and the audit job skipped, RED otherwise (including the load-bearing case
  where the `changes` pre-job itself failed).
- **`run-name`** —
  `Playwright A11y • ${{ github.event_name }} • ${{ github.ref_name }}`,
  mirroring `lighthouse.yml`'s `run-name` clause shape.

### Triggers and run profile

- **Pull requests against `main`** — every PR triggers the workflow; the
  `changes` pre-job decides whether the audit job runs. Path-skipped PRs still
  receive a `Playwright A11y Status` check.
- **Nightly schedule** (`cron: '0 3 * * *'` UTC, aligned with `lighthouse.yml`)
  — the audit always runs.
- **`workflow_dispatch`** — on-demand re-run.
- **Not triggered on `push` to `main`.** Same reasoning as ADR-0053.

The Playwright runner profile is single-pass on both PR and nightly runs — axe
results are deterministic (no Lighthouse-style score variance), so the
median-of-N pattern is not needed. PR feedback time is bounded by the Playwright
build-and-browser-install step (~3–4 minutes), comparable to ADR-0053's
PR-profile budget.

### Activation: monitor-only → required

The gate ships **monitor-only**. The `Playwright A11y Status` check is NOT in
the branch-protection required-check list at day one. After **three consecutive
clean nightly runs on `main`** (mirroring ADR-0053's discipline — uniform
operations rule across both gates), the owner flips it to required:

1. Observe three consecutive clean nightly `playwright-a11y.yml` runs.
2. In GitHub Branch Protection, add `Playwright A11y Status` to the
   required-check list (the status job, **not** `Playwright A11y Audit` — the
   audit job is path-gated).
3. Remove the `categories:accessibility` assertion from `lighthouserc.cjs` and
   `lighthouserc.desktop.cjs` per the procedure in `docs/MAINTENANCE.md` §
   Playwright A11y. Lighthouse retains Performance, Core Web Vitals, SEO, and
   Best-Practices.

The activation checklist is a dated item in `docs/MAINTENANCE.md`. This branch
documents the procedure; it does not perform the Lighthouse-config edit.

### Renovate manual-review lane

`renovate.json` carries a new `packageRules` entry routing `playwright` to
manual review (`automerge: false`, label `["playwright-a11y"]`), mirroring the
`@lhci/cli` lane. Playwright minor / patch bumps can carry browser-binary
updates that change scan behaviour and deserve a deliberate PR. A parallel lane
for `axe-core` itself is recommended for the same reason — rule-set behaviour
can change minor-to-minor and the same construction-invariant the helper
preserves should also gate the version it pins.

## Consequences

### Positive

- **One axe oracle, one version, across both a11y layers.** Component fragments
  and full pages assert against the same `axe-core@4.11.4` rule set. A future
  bump moves both layers in one `package.json` edit.
- **Interactive-state a11y becomes verifiable** for the first time — Modal open,
  MobileMenu open, focus-trap, focus-return all carry automated assertions at
  day one.
- **The single-pinned-axe-core invariant is held by construction**, not by
  per-contributor verification at every Renovate bump. The Bus-Factor / AI-first
  principle the project optimises for is honoured.
- **The grep-decidable invariant scales by layer.** `rg "axe-core" src/`
  resolves to exactly two files today; a future shadow-DOM-isolation realm would
  add a third file with the same naming convention. The invariant is stated in
  terms of layers, not in terms of a hard-coded file count.
- **Mirror-shape between the two layers** lowers the learning cost for a future
  maintainer: read `a11y.ts`, recognise `a11yPage.ts`'s shape; vice versa.
  ADR-0052's `axe.source`-into-realm rationale carries forward.
- **The Accordion `definition-list` / `dlitem` contradiction is settled
  empirically**, not by argument. The first page-level scan against the two
  `<Accordion>`-bearing routes (`/how-it-works`, `/services/competition-prep`)
  runs as part of the normal `routes.spec.ts` 9-URL × 2-viewport sweep — no
  separate diagnostic spec file ships. The outcome is captured in the
  spec-introducing commit's body and in the PR description; the resolution rule
  below governs which artefact carries the linked follow-up.
- **The CI surface mirrors `lighthouse.yml`'s shape** — same path-filter
  pre-job, same status-companion job, same per-job permissions, same SHA pins. A
  future maintainer reading either workflow recognises the pattern. The
  flip-to-required path stays viable under path-gating.

### Negative

- **A new test runtime (Playwright) and CI surface** are added. Playwright is
  scoped to accessibility only in this stream; if it is adopted for unrelated
  reasons later, a separate ADR records that.
- **The `tests/a11y/` directory introduces a second test root** alongside
  `src/`'s co-located Vitest tests. The two are disjoint by extension
  (`.spec.ts` vs. `.test.ts`) and by directory, but a contributor unfamiliar
  with the split could accidentally write a Vitest test under `tests/a11y/` or a
  Playwright test under `src/`. The convention amendment in
  `docs/CONVENTIONS.md` § Testing Conventions records the split.
- **A second Renovate manual-review lane** to maintain (mirroring `@lhci/cli`).
  Browser-binary changes in Playwright minor / patch releases deserve the manual
  review; the cost is one PR per Playwright bump.
- **No `pnpm test:a11y` wrapper script day one.** The local invocation is
  `pnpm exec playwright test` against a built `dist/`. Adding a wrapper would
  not fit ADR-0050's three-prefix convention (`check-*`, `generate-*`,
  `query-*`); the implementer surfaces the trade in the MAINTENANCE.md
  subsection and a future stream may add a wrapper if the ergonomic cost becomes
  visible.
- **Page-layer scan wall-time is a few seconds per (URL, viewport) pair** — at
  18 default-render scans plus interactive-state scans, the audit job's
  wall-time is ~2–3 minutes on the GHA surface. Cheap, but not free.

### Risk mitigation

- **Inject-the-pinned-source approach** removes the transitive-version drift
  risk by construction (Approach 1, chosen over Approach 2).
- **Renovate manual-review lane for `playwright`** (and the parallel lane for
  `axe-core` itself, where engaged) surfaces browser-binary updates and rule-set
  changes as deliberate PRs.
- **Monitor-only at day one + three-clean-nightly-runs activation gate** mirrors
  ADR-0053's discipline; the introductory PR can land with surface-CI-observed
  findings without blocking its own merge.
- **Workflow path-gating + always-running status job** keeps the flip-to-
  required path viable under the path filter — same in-workflow shape ADR-0053
  uses.
- **Disjoint test extensions** (`.test.ts` vs. `.spec.ts`) keep Vitest and
  Playwright from colliding in discovery; the implementer verifies by grep at
  Phase 3.

### Resolution rule — Accordion `definition-list` / `dlitem`

The first page-level scan against the two `<Accordion>`-bearing routes runs as
part of `routes.spec.ts`'s 9-URL × 2-viewport sweep and produces one of two
outcomes. The outcome itself is captured in the spec-introducing commit's body
and in the PR description — not in this ADR's body. This decision rule governs
what happens in either branch and is the forever-relevant architectural contract
this ADR records.

- **Clean — the Accordion renders cleanly under the page-level scan.** The
  ADR-0052 component-layer disable
  (`disableRules: ['definition-list', 'dlitem']` on
  `src/components/ui/accordion.test.ts`'s a11y block) was justified as a
  JSDOM-only false positive; the ADR-0053 baseline finding is on a different
  `<dl>` elsewhere. The candidate `<dl>` is identified and linked as a tracked
  follow-up in the PR description. The component-layer disable stays in place.

- **Flag — the Accordion renders with a real `dlitem` / `definition-list`
  violation under the page-level scan.** The ADR-0052 disable is masking a real
  defect; the Accordion's `<dl>` markup needs a fix. The defect is opened as its
  own tracked debt entry (added to `docs/debt/REGISTER.md` in the same commit
  batch as the OQ4-deferred follow-ups); the page-layer scan is NOT silenced for
  it; the ADR-0052 disable's justification is re-evaluated in a separate
  follow-up stream (an ADR-0052-surface change, not in this branch's scope).

The rule above is the architectural decision; the empirical outcome is a Phase-3
finding recorded in the git history (commit body + PR description), consistent
with ADR-0052's "probe-then-record" precedent and ADR-0053's
amendment-via-revision-history pattern. This ADR's body does not carry an
empirical observation it would have to overwrite on re-scan.

## Alternatives considered

(Detailed in § Context → Evaluated approaches.)

- Adopt `@axe-core/playwright` and constrain its transitive `axe-core` to 4.11.4
  via `pnpm.overrides` plus a second Renovate lane (Approach 2). Rejected —
  manual-policy invariant vs. construction-invariant.
- Extend the ADR-0052 JSDOM helper to full pages (Approach 3). Rejected — JSDOM
  has no layout engine, three load-bearing properties fail.
- Lighthouse owns page-level a11y permanently (Approach 4). Rejected — two axe
  versions, no per-rule control, no interactive-state coverage.
- Stay at the component layer only (Approach 5). Rejected — structurally blind
  to three classes of defect.

## Success criteria

- The `playwright-a11y.yml` workflow runs the audit job on perf-relevant PRs
  against `main` and on the nightly schedule; the `playwright-a11y-status` job
  produces a `Playwright A11y Status` check on every PR (success when the audit
  passes or is legitimately path- skipped; RED otherwise).
- The 18 (URL × viewport) default-render scans (including the two
  `<Accordion>`-bearing routes that settle OQ6) and the four interactive-state
  scans all assert via the page-layer helper.
- `rg "axe-core" src/` resolves to exactly two files (`src/test-utils/a11y.ts`
  and `src/test-utils/a11yPage.ts`).
- Three consecutive clean nightly runs on `main` allow the owner to flip
  `Playwright A11y Status` into the required-check list and to remove the
  `categories:accessibility` assertion from `lighthouserc.cjs` and
  `lighthouserc.desktop.cjs`.

## Documentation Updates

Land in the same commit series as this ADR:

- `docs/CONVENTIONS.md#component-level-accessibility-tests` — amend the "single
  sanctioned call site" wording (lines 1520-1521) to "one of two sanctioned
  `axe-core` call sites — the page-layer counterpart is
  `src/test-utils/a11yPage.ts` under ADR-0057; `rg "axe-core" src/` resolves to
  these two files".
- `docs/CONVENTIONS.md#page-level-accessibility-tests` — **new subsection**
  immediately after Component-Level Accessibility Tests, mirroring its shape:
  the rule, the helper signature (`expectPageNoA11yViolations`), the coverage
  surface (9-URL canonical set × 2 viewports + interactive states), the
  inline-disable convention, the `.spec.ts`-vs-`.test.ts` discovery-disjointness
  note.
- `docs/CONVENTIONS.md#topic-hub-index` — new entry "**When writing a page-level
  a11y assertion under `tests/a11y/`** — see § Testing Conventions → Page-Level
  Accessibility Tests
  ([ADR-0057](adr/0057-page-level-accessibility-testing-with-playwright.md))."
  Placed after the ADR-0056 entry to keep numerical order.
- `docs/ARCHITECTURE.md#adr-quick-reference` — new row 0057.
- `docs/ARCHITECTURE.md#where-to-find-coding-rules` — new bullet mirroring the
  Hub Index entry.
- `docs/ARCHITECTURE.md#performance-and-quality-gates` — extend to record that
  page-level a11y is owned by ADR-0057 (Playwright + pinned axe-core);
  Lighthouse's Accessibility category interim until promotion; one-line note on
  the repo now carrying two test-runner configs (`vitest.config.ts` for Vitest
  under `src/`, `playwright.config.ts` for Playwright under `tests/a11y/`).
- `CLAUDE.md#conventions-quick-reference` — append to the Testing bullet: ";
  page-level a11y in `tests/a11y/` via the Playwright helper
  `src/test-utils/a11yPage.ts` (ADR-0057)."
- `docs/MAINTENANCE.md#playwright-a11y` — **new subsection** mirroring §
  Lighthouse CI: trigger table, configuration pointer, activation checklist
  (monitor-only → required after three clean nightly runs), the documented
  Lighthouse-Accessibility-category-removal procedure (gated on promotion, not
  performed here).
- `docs/MAINTENANCE.md#branch-protection-configuration` — add one new row for
  `playwright-a11y.yml` (`Playwright A11y Status` / `Playwright A11y Audit`)
  with the monitor-only footnote.
- `docs/MAINTENANCE.md` — add a forward-reference from the existing § Lighthouse
  CI → Activation checklist to the Lighthouse-Accessibility-category-removal
  procedure documented in the new § Playwright A11y subsection.
- `docs/adr/0053-performance-and-quality-gates-with-lighthouse-ci.md` — append a
  foot cross-reference under § References: "Accessibility coverage of this gate
  superseded by ADR-0057. The Performance, Core Web Vitals, SEO, and
  Best-Practices categories of this gate remain in force." Body not edited.
- `src/test-utils/a11y.ts` — JSDoc edit only (lines 5-7 replaced to name
  `src/test-utils/a11yPage.ts` explicitly).
- `docs/debt/REGISTER.md` — one new entry DEBT-260526-01 enumerating the
  OQ4-deferred interactive-state follow-ups (QuizModal step-by-step,
  ServicesFilter post-filter, SessionConfigurator post-configuration,
  ContactForm prefill branches, broader Accordion expand-state). A second entry
  DEBT-260526-02 may land in the same commit if the OQ6 Flag branch fires (the
  Accordion `<dl>` markup defect).

Per CONVENTIONS.md § Topic Hub Index Maintenance, the four coupling sites (Hub
Index entry, target-section body, ARCHITECTURE.md § Where to Find Coding Rules,
ARCHITECTURE.md § ADR Quick Reference) update together in the same coupling-work
commit.

## References

- [ADR-0030](0030-csp-strategy.md) — CSP hash strategy. The Playwright realm
  runs against the static-served `dist/`; Netlify's production CSP headers are
  not exercised. Unaffected.
- [ADR-0037](0037-adopt-astro-container-api-for-component-tests.md) — Astro
  Container API for component tests. The render path the component-layer helper
  consumes; this ADR's page layer does not consume the Container API (it
  consumes real browser renders) but inherits the JSDOM-as-library /
  realm-injection class of reasoning.
- [ADR-0050](0050-script-entry-point-naming-convention.md) — the three-prefix
  script-entry-point convention. Justifies the day-one decision not to add a
  `pnpm test:a11y` wrapper (no prefix fits).
- [ADR-0052](0052-component-level-accessibility-testing-with-axe-core.md) —
  Component-level a11y testing with axe-core. **Extended by this ADR to the page
  layer.** The single-pinned-`axe-core@4.11.4` invariant the two layers share.
- [ADR-0053](0053-performance-and-quality-gates-with-lighthouse-ci.md) —
  Performance and Quality Gates with Lighthouse CI. The
  `categories:accessibility` assertion of this gate is **superseded by this
  ADR**. The rest of ADR-0053 (Performance, Core Web Vitals, SEO,
  Best-Practices, the resource-transfer budgets, the monitor-only → required
  activation discipline) remains in force.
- [axe-core API reference](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)
  — `axe.run` signature and the `axe.min.js` bundle injected into the page
  realm.
- [Playwright documentation — page.addScriptTag](https://playwright.dev/docs/api/class-page#page-add-script-tag)
  — the API the helper uses to inject the pinned `axe.min.js` into the page
  realm.
