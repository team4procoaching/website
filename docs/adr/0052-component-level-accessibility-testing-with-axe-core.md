# Component-Level Accessibility Testing with axe-core

Date: 2026-05-19

## ADR Warrant Check

- [x] **A — Contract**: every component under `src/components/ui/` and
      `src/components/navigation/` must include at least one axe assertion in
      its test file via the project's `expectNoA11yViolations` helper; CI fails
      on any axe violation.
- [ ] **B — Asymmetry**: n/a; the rule is uniform across the named surfaces.
- [x] **C — External revisit**: revisit if Playwright is adopted for other
      purposes (E2E user flows, visual regression); component-level coverage is
      the entry point, page-level a11y coverage moves to `@axe-core/playwright`
      only if Playwright lands.

## Status

Accepted

## Context

The codebase has matured to roughly 40 typed Astro components across
`src/components/{layout,navigation,sections,ui}/`. Accessibility regressions
today are caught only by manual review or by post-launch user reports. The
`reviewer` agent applies generic conventions but has no automated a11y signal at
the component level — a missing `aria-label`, a `role="button"` on an actual
`<button>`, or a focus trap that breaks Tab order can pass the existing pre-push
gate (Biome, conventions check, Vitest, reviewer-agent prose review) and only
surface in production.

[ADR-0037](0037-adopt-astro-container-api-for-component-tests.md) (Astro
Container API for component tests) established that Prop-to-DOM regressions are
caught by rendering the component with typed Props and asserting against the
produced HTML. The same render path supports running an a11y rule engine over
the rendered output — the missing piece is the rule engine plus a project
convention requiring its use.

The wider testing strategy across this and the next quality-gate ADR is
intentional: component-level a11y catches per-component regressions at PR time;
a separate page-level Lighthouse-CI stream catches integration-level a11y on the
built pages (see § References — that ADR is a forward reference, not yet
authored).

### Decision drivers

- Zero-friction adoption: the existing Vitest pipeline already runs ADR-0037
  Container-API tests; the a11y helper plugs in without a parallel stack.
- Mobile-heavy audience: a11y is UX, not a compliance line-item; regressions
  cost engagement directly.
- Bus-Factor: the rule engine and the failure mode it catches are both
  documented and testable in the same place as the component.
- Complementarity with page-level a11y (the Lighthouse-CI stream):
  component-level tests catch regressions in isolation; page-level audits catch
  regressions in composition (focus order across components, landmark
  uniqueness, etc.).
- AI-first workflow
  ([ADR-0037 § Decision Drivers](0037-adopt-astro-container-api-for-component-tests.md)):
  regressions that AI-generated template edits can plausibly introduce — a
  removed `aria-*`, a swapped semantic element, a dropped `alt` — must be caught
  by a failing test, not by reviewer discipline.

### Evaluated approaches

1. **`axe-core` direct call from a project helper, over Astro Container API
   renders.** The component renders to an HTML string via `renderAstro` (per
   ADR-0037); the project helper `expectNoA11yViolations` constructs a JSDOM
   instance from the string, injects axe-core's bundled source into that JSDOM
   realm, and runs `axe.run(document.body, ...)` inside the realm with the
   project's rule-set baked in. Component tests call the helper alongside their
   existing assertions. **Chosen.** Composes with the JSDOM-as-library deviation
   that ADR-0037 § Conventions documents and that the five existing component
   tests already follow; centralises rule-set configuration so individual tests
   do not drift; sustains the "one grep-visible import site" invariant the
   project uses for experimental and infrastructure APIs (`rg "axe-core" src/`
   resolves to exactly one file, mirroring
   `rg "experimental_AstroContainer" src/`).

2. **`vitest-axe` matcher with project-wide `setupFiles` registration.** The
   standard `vitest-axe` pattern: `expect.extend({ toHaveNoViolations })` in a
   `setupFiles`-loaded module under `@vitest-environment jsdom`. **Rejected.**
   The pattern requires the `jsdom` Vitest environment as a global, which
   collides with the ADR-0037 `TextEncoder`/`Uint8Array` realm-mismatch in the
   Container API's esbuild module-evaluation. The five existing component tests
   sidestep that clash precisely by _not_ using the pragma and importing JSDOM
   as a library instead. Re-introducing the pragma to satisfy `vitest-axe`'s
   standard pattern would either reverse ADR-0037's deviation (and break the
   existing five tests) or fork the test surface into pragma-using and
   pragma-avoiding files (parallel infrastructure, drift risk). The matcher's
   value-add — `.toHaveNoViolations()` over `await expectNoA11yViolations(html)`
   — does not compensate for the realm-clash cost.

3. **`@axe-core/playwright` against the built site.** Real browser, real CSS,
   real focus management. Catches integration-level a11y that axe-in-JSDOM does
   not. **Rejected for adoption _now_** because the project has no Playwright
   suite — adopting Playwright for a11y alone is a significant new
   infrastructure commitment (browser install, separate worker pool, CI minutes,
   flake management). Revisited if Playwright is adopted for unrelated reasons.

4. **`axe-core` CLI against the static build.** Decouples a11y from the
   unit-test pipeline; runs against the actual built HTML rather than the
   Container-API render. **Rejected.** Poor per-component addressability
   (failures surface as "this page has 3 violations" rather than "this
   component's variant X violates rule Y"), and the reviewer-agent workflow
   already operates per file, not per page. The complementary page-level layer
   is covered by the separate Lighthouse-CI stream (see § References).

## Decision

Adopt `axe-core` as the a11y rule engine for component tests. A project helper
`expectNoA11yViolations` at `src/test-utils/a11y.ts` exposes the only sanctioned
axe-core call site; every test file under the covered surface calls the helper
to assert that the rendered HTML has no axe violations under the project's
chosen rule set.

The project-wide setup:

1. **Dependency**: add `axe-core` as a `devDependency`. The `vitest-axe` library
   is **not** adopted — the realm-clash documented in ADR-0037 § Conventions
   makes its standard integration shape incompatible with the project's Vitest
   configuration. The helper calls `axe-core` directly.

2. **Test-utils helper**: add `src/test-utils/a11y.ts` exporting an async
   `expectNoA11yViolations(html: string, options?: { disableRules?: readonly string[] }): Promise<void>`
   function. The helper:
   - constructs a JSDOM instance per call with the `runScripts` option set
     (`const dom = new JSDOM(html, { runScripts: 'outside-only' })`), under the
     default Node Vitest environment — no `@vitest-environment jsdom` pragma is
     introduced. The `runScripts: 'outside-only'` option is required: it is what
     makes `dom.window.eval` (next step) functional. With the default
     `new JSDOM(html)`, `window.eval` is a no-op and the axe-core injection
     silently fails to define `window.axe`;
   - injects axe-core's bundled source into the JSDOM realm via
     `dom.window.eval(axe.source)` — `axe-core` exposes `axe.source` as a
     self-contained bundle string, and evaluating it inside the JSDOM realm
     defines `window.axe` bound to that realm's DOM globals;
   - runs `await dom.window.axe.run(dom.window.document.body, runOptions)`
     _inside the JSDOM realm_, scoping the scan to the rendered fragment;
   - fails the surrounding Vitest assertion (via
     `expect(violations).toEqual([])` or equivalent) if any violations are
     reported, with an error message carrying each violation's rule id, help
     URL, and failing-element snippet.

   Running axe **inside** the JSDOM realm — rather than importing `axe` into the
   Node realm and calling `axe.run(jsdomDocument)` across realms — is the
   load-bearing detail. axe-core run from the Node realm walks the DOM through
   the Node realm's `instanceof` checks and global constructors; a JSDOM
   document is built from JSDOM's own constructors, so cross-realm checks can
   fail or behave inconsistently. The `axe.source`-into-realm injection
   sidesteps this — the same class of realm clash ADR-0037 § Conventions
   documents for the esbuild module-evaluation step. The helper inherits the
   JSDOM-as-library pattern from ADR-0037 § Conventions verbatim and records the
   realm-injection rationale in its JSDoc. The rule-set configuration is
   centralised inside the helper so individual tests do not drift; per-test
   `disableRules` extend (do not replace) the baseline.

3. **Rule set**: axe-core defaults plus WCAG 2.1 AA
   (`tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']`). The helper applies a
   baseline of project-wide rule disables for **fragment-rendering rules** that
   axe runs only meaningfully against a full HTML document: `region`,
   `landmark-one-main`, `page-has-heading-one`, `html-has-lang`,
   `html-lang-valid`, `bypass`, `document-title`, `meta-viewport`. Component
   renders are HTML fragments, not full documents — these rules would fire false
   positives on every assertion. The baseline is documented in `a11y.ts` with a
   per-rule justification comment.

4. **Per-test rule disables**: permitted with a documented inline justification
   on a single comment line immediately preceding the helper call, in the form
   `// axe-disable: <rule-id> — <one-line justification>` (em-dash separator, no
   trailing period, matching the existing `// @ts-expect-error — ...`
   inline-disable convention in the codebase). The proximity discipline is the
   convention's reviewer-enforceability anchor: a disable without an adjacent
   justification is a review finding. Multi-line justifications or
   file-header-block placements are not used. Project-wide rule changes
   (additions to the baseline disable set, switching to WCAG 2.2 AA) route
   through a separate future ADR.

5. **Convention surface**: every `*.test.ts` file co-located with a component
   under `src/components/ui/` and `src/components/navigation/` includes at least
   one assertion via `expectNoA11yViolations` covering each rendered variant.
   This is a test-presence/process convention — its canonical home is
   `CONVENTIONS.md § Testing Conventions`, surfaced via the Topic Hub Index and
   the `CLAUDE.md § Conventions Quick Reference` Testing bullet. It is **not** a
   `CLAUDE.md` Critical Rule: the Critical Rules list holds code-shape contracts
   and runtime/security invariants read at every implementer code-edit dispatch,
   and a test-presence rule placed there would mis-signal as a code-shape
   violation rather than a missing test. The `reviewer` agent's Phase-4 a11y
   heuristics are the enforcement surface (see point 7).

6. **Section-level coverage gap**: components under `src/components/sections/`
   and `src/components/layout/` are not required to carry a11y component tests;
   their a11y is verified at page-composition level by the Lighthouse-CI stream
   (see § References). The split avoids redundant tests for components that have
   no rendering meaning outside a page.

7. **Enforcement**: the convention is documented in
   `CONVENTIONS.md § Testing Conventions` and surfaced in the Topic Hub Index.
   The `reviewer` agent flags missing a11y assertions during Phase 4 review of
   new or modified components in the covered surface. No coverage-tracking tool
   is added (an a11y-coverage sensor would not earn its build under ADR-0050's
   catch-frequency rubric).

### Probe outcome — the three uncertain components

Phase-1 OQ3 flagged three components as uncertain — `CheckIcon.astro`
(decorative SVG), `Modal.astro` (`<el-dialog>` custom elements from
`@tailwindplus/elements`), and `SmartImage.astro` (`astro:assets` build-time
`<Image />`). A real `axe.run()` was executed against all three under this
project's Vitest/Node environment, using the WCAG 2.1 AA ruleset and the
fragment-mode disables listed in point 3, via the `axe.source`-into-JSDOM-realm
mechanism in point 2:

| Component                           | axe violations | axe incomplete | Outcome                                           |
| :---------------------------------- | :------------- | :------------- | :------------------------------------------------ |
| `CheckIcon.astro`                   | 0              | 0              | Standard coverage, no per-test disables required. |
| `Modal.astro`                       | 0              | 0              | Standard coverage, no per-test disables required. |
| `SmartImage.astro` (remote variant) | 0              | 0              | Standard coverage, no per-test disables required. |

All three are covered as standard test files; none needs a skip-file or a
per-test rule disable. axe accepts `CheckIcon`'s `aria-hidden="true"` decorative
subtree, `Modal`'s `sr-only` close-button accessible name and `aria-labelledby`
reference, and `SmartImage`'s non-empty remote-variant `alt`. The custom-element
semantics from `@tailwindplus/elements` did not trip structural false positives.

### What does NOT change

- The existing test files and their assertions remain. The a11y assertion is
  _added_ to the test file, not a replacement for any existing assertion.
- ADR-0037's Container-API pattern and the `renderAstro` helper are unchanged.
  The a11y helper consumes their output.
- The ADR-0037 JSDOM-as-library deviation and the file-header comment block that
  documents it remain verbatim in every component test file, existing and new.
- The Critical Rule set, naming conventions, and existing CI workflows
  (`quality.yml`, `tests.yml`, `semgrep.yml`, `links.yml`) are unaffected. The
  a11y assertions run inside the existing Vitest job in `tests.yml`. **No
  Critical Rule is added** — the a11y test-presence convention lives in
  `CONVENTIONS.md` and the Conventions Quick Reference, not in the Critical
  Rules list.
- The Vitest configuration at `vitest.config.ts` is unchanged — no `setupFiles`
  is introduced, the `@vitest-environment` pragma is not enabled globally, and
  the include patterns continue to cover `src/**/*.test.ts`.
- Page-level a11y (the Lighthouse-CI stream) is the separate, complementary
  check at page composition level.
- The reviewer-agent system prompt gains a11y heuristics in a separate,
  sequentially-dependent update (a parallel reviewer-a11y-heuristics task).

### Scope and non-goals

**In scope:**

- Component-level a11y testing for `ui/` and `navigation/` components (24
  components total: 18 in `ui/`, 6 in `navigation/`).
- A reusable test helper centralising axe configuration.
- Topic Hub entry and `CONVENTIONS.md` / `CLAUDE.md` updates.

**Out of scope:**

- Page-level a11y (covered by the separate Lighthouse-CI stream).
- Keyboard interaction testing across multi-component flows (Playwright
  territory).
- Screen-reader smoke tests.
- Manual a11y audits or VPAT generation.
- ADR-0037-style Prop-to-DOM regression coverage for the 19 components without
  existing test files — this stream adds an a11y assertion as the file's _only_
  test; deeper Prop-to-DOM coverage is a natural follow-up but not in scope
  here.

### Known Limitations

- **JSDOM is not a full browser.** axe-core in JSDOM cannot judge computed CSS
  layout, actual focus traversal, or rendered color contrast. The
  `color-contrast` rule, in particular, is effectively disabled by axe itself
  when run under JSDOM (no `getComputedStyle` results for color tokens). The
  Lighthouse-CI stream closes part of this gap at the page-composition level for
  production-built CSS. Component-level coverage is the entry point, not the
  whole accessibility programme.
- **Empty rendered HTML resolves vacuously.** `expectNoA11yViolations('')`
  resolves without throwing — required for the legitimate `Accordion items: []`
  case (rendered HTML is empty). The side effect is that a component that
  mistakenly produces empty HTML would pass its a11y assertion silently; the
  helper's JSDoc records this, and tests that need to assert a non-empty render
  add a structural assertion alongside the a11y assertion.
- **`SmartImage.astro` local-asset variant deferred.** The
  `{ kind: 'local', src: importedImage }` variant requires a build-time
  `ImageMetadata` import that the test fixture surface does not currently
  produce. The new `smartImage.test.ts` covers only the
  `{ kind: 'remote', src, width, height }` variant; local-variant coverage is
  deferred to a follow-up stream and tracked in `docs/debt/REGISTER.md` if the
  deferral lasts longer than three months.
- **Custom elements from `@tailwindplus/elements` (`<el-dialog>`,
  `<el-disclosure>`, `<el-dialog-backdrop>`, `<el-dialog-panel>`).** JSDOM does
  not recognise these elements; axe treats them as generic HTML elements with no
  implicit role. The probe (see § Decision — Probe outcome) verified with a real
  `axe.run()` that the rendered HTML carries the load-bearing `aria-*` and `id`
  attributes (`Modal.astro`'s `<dialog aria-labelledby>`, `Accordion.astro`'s
  `<button commandfor>` ↔ `<el-disclosure id>` pairing) and axe asserts against
  those, returning 0 violations for Modal. The custom-element runtime semantics
  (Tab order, scroll lock, backdrop click) are not exercised by axe-in-JSDOM and
  remain a manual-test surface.

## Consequences

### Positive

- A11y regressions in covered components are caught at PR time, not in
  production.
- The helper runs against every test invocation, including watch mode during
  development.
- Reviewer agent can rely on automated coverage for axe-detectable issues and
  focus prose review on semantic intent.
- The convention is self-documenting: a missing a11y assertion in a covered test
  file is visible in code review and during the Phase-4 reviewer pass.
- Single grep-visible import site for `axe-core` (`rg "axe-core" src/` resolves
  to exactly one file) — when axe-core is updated, replaced, or augmented, the
  change is one file plus a dependency bump.

### Negative

- Tests run slightly slower; axe is non-trivial CPU work per assertion, and each
  assertion constructs a fresh JSDOM instance and injects the axe-core bundle
  into it. Expected single-digit-percent increase to `pnpm test:run` wall time
  at the 24-component scale; measured during Phase 3 and recorded in the PR
  body.
- axe-in-JSDOM is a strict subset of real-browser axe (no computed layout, no
  actual focus, no resolved color contrast). The page-level Lighthouse audit
  closes part of this gap; the component-level gap is the accepted scope of this
  ADR.
- A11y test failures can be noisy initially as the existing component baseline
  is audited for the first time. The probe of the three highest-uncertainty
  components (CheckIcon, Modal, SmartImage) returned 0 violations, which lowers
  this risk; the stream's commit plan still splits the 19 new test files into
  reviewable batches to keep any remaining noise localisable.
- Direct `axe-core` invocation foregoes the `vitest-axe` matcher's
  pretty-printing of violation reports. The helper replicates the relevant
  fields (rule id, help URL, failing element snippet) in its assertion-failure
  message; the loss is small.

### Risk mitigation

- Initial adoption introduces the helper across the covered surface in one
  feature stream; baseline violations are either fixed in the same stream or
  annotated with rule disables plus inline justification comments. The
  `debt-auditor` can be invoked post-adoption for any residual findings that
  were too large to address in-stream.
- The complementarity with the Lighthouse-CI stream covers the
  JSDOM-vs-real-browser gap for the highest-traffic pages.
- The "one grep-visible import site" invariant means that if `axe-core` is
  sunset or replaced (e.g., the project adopts a different a11y engine), the
  migration is one helper file plus a dependency swap. Test files call
  `expectNoA11yViolations`, not `axe.run`.

## Success criteria

- Every `*.test.ts` file under `src/components/ui/` and
  `src/components/navigation/` contains at least one `expectNoA11yViolations`
  call covering each tested variant. The Phase-1 strong-coverage reading is
  honoured: 24 components reach coverage in this stream (5 existing tests
  extended, 19 new test files created).
- The CI `tests.yml` workflow fails on any axe violation (no warn-only mode).
- The reviewer agent's Phase 4 checklist surfaces a missing a11y assertion as a
  Major finding on new components in the covered surface.
- `rg "axe-core" src/` resolves to exactly one file (`src/test-utils/a11y.ts`).

## Documentation Updates

- `docs/CONVENTIONS.md#testing-conventions` — add subsection "Component-Level
  Accessibility Tests" between the "Vitest is the unit-test runner" paragraph
  and the "Test Fixture Identifiers and the Pre-Commit Gitleaks Hook"
  subsection. This is the **canonical home** of the a11y test-presence
  convention. Cover: the rule, the helper signature, the coverage floor, the
  inline-single-line disable-justification convention.
- `docs/CONVENTIONS.md#topic-hub-index` — add entry "**When writing a component
  under `src/components/ui/` or `src/components/navigation/`** — see
  [§ Testing Conventions → Component-Level Accessibility Tests](#component-level-accessibility-tests)
  ([ADR-0052](adr/0052-component-level-accessibility-testing-with-axe-core.md))."
  Place it immediately after the ADR-0050 entry and before the first ADR-0051
  entry, so the ordering matches the ADR Quick Reference numbering.
- `docs/CONVENTIONS.md#component-tests-with-astro-container-api` — append a
  one-sentence cross-reference pointing at the new subsection.
- `docs/ARCHITECTURE.md#adr-quick-reference` — add row:
  `| 0052 | Component-level a11y testing (axe-core) | Accepted | `expectNoA11yViolations`helper over Container API render; WCAG 2.1 AA tags;`ui/`and`navigation/` coverage floor |`.
- `docs/ARCHITECTURE.md#where-to-find-coding-rules` — add bullet mirroring the
  Hub Index entry.
- `CLAUDE.md#conventions-quick-reference` — append to the Testing bullet: ";
  a11y assertions are required for `ui/` and `navigation/` components via
  `expectNoA11yViolations` (ADR-0052)." This is the only `CLAUDE.md` edit.
- **No `CLAUDE.md` Critical Rule is added.** The a11y test-presence convention
  is a process/coverage rule, not a code-shape or runtime/security invariant;
  the Critical Rules list is not its home. See § Decision point 5 for the
  reasoning.
- `.claude/agents/reviewer.md` — a11y heuristics added in a separate parallel
  task; this ADR's Documentation Updates do not include the reviewer-agent edit.

Per CONVENTIONS.md § Topic Hub Index Maintenance, the four coupling sites (Hub
Index entry, target-section body, ARCHITECTURE.md § Where to Find Coding Rules,
ARCHITECTURE.md § ADR Quick Reference) update together in the same docs commit.

## References

- [ADR-0037 — Adopt Astro Container API for component tests](0037-adopt-astro-container-api-for-component-tests.md).
  The render path this ADR consumes and the JSDOM-as-library deviation this ADR
  inherits.
- [ADR-0050 — Script entry-point naming convention](0050-script-entry-point-naming-convention.md).
  Justifies why no `check-a11y-coverage.mjs` sensor is added — at the current
  component count, an a11y-coverage sensor would not earn its build under the
  catch-frequency rubric.
- **Forward reference — page-level Performance and Quality Gates with Lighthouse
  CI.** The page-level complement to this ADR's component-level scope, developed
  as a separate parallel stream. As of this ADR's date the sibling ADR is **not
  yet authored**; an ADR number is reserved for it but no live document exists,
  so the reference here is forward-dated rather than a resolvable link.
  (Reserved provisional number: ADR-0053 — ADR numbers are confirmed at the
  Pre-Push Gate, so the final number may differ.)
- [ADR-0030 — CSP hash strategy](0030-csp-strategy.md). Unrelated but worth
  noting: the a11y helper runs at test time only, not at build time; no inline
  scripts or styles are introduced that would require new CSP hashes.
- [axe-core rule descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
  — upstream documentation for the rule set.
- [axe-core API reference](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)
  — `axe.run` signature and options, and the `axe.source` bundled-source export
  the helper injects into the JSDOM realm.
