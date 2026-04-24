# Adopt Astro Container API for Component Tests

Date: 2026-04-24

## Status

Accepted

## Context

[ADR-0016](0016-use-vitest-for-unit-testing.md) established Vitest as the unit
test runner and explicitly put component tests out of scope on the grounds that
"Astro components require a rendering context." At the time, every testable
behaviour the project owned lived in `src/utils/` or `src/scripts/`, so pure
Vitest against plain TypeScript covered the ground.

The Services-page cross-reference task
(`docs/work/2026-04-24-services-how-it-works-cross-reference/`) ran into the
boundary of that scope. The task adds a `size: 'default' | 'compact'` Prop to
`ProcessSteps.astro` and a fallback from `step.description` to
`step.shortDescription` when the compact variant is active. The fallback logic
is isolable and covered by a pure helper (`pickStepText`). Two regression modes
are not, however, covered by the helper alone:

1. **Template regression — helper imported but return value ignored.** A future
   edit could keep the `pickStepText` import and `<p>` structure intact but
   hardcode `step.description` inside the `<p>`. Every helper test would
   continue to pass; the compact render would ship wrong output. Commit-level
   review is the same social layer that would have introduced the regression, so
   it does not qualify as an independent check.
2. **Template regression — `eyebrow` gate bypassed.** Acceptance criterion #6
   requires that `<ProcessSteps eyebrow="" …>` produces no eyebrow `<p>`
   element. That property is Prop-to-DOM, not function-to-return-value, and no
   pure helper extraction captures it without duplicating the `SectionHeader`
   call path.

The concept-review for the task (`docs/work/.../02-concept-review.md`, Major 3)
flagged both gaps and rejected the proposed mitigations (commit-level review
plus a manual build-output diff) as mechanically weak. Under the project's
AI-first workflow — see the user-memory note `user_ai_first_workflow.md` —
regression classes that AI-generated template edits can plausibly introduce must
be caught by typed boundaries and failing tests, not by reviewer discipline. The
Service-Detail-Page parallel initiative is expected to reach the same boundary
for the same reason.

### Decision drivers

- **Structural safety over reviewer discipline.** Prefer mechanisms that fail
  loud (test failure) over mechanisms that require a reviewer to notice the
  right diff line.
- **Pure-function extraction first, rendering context second.** A pure helper
  with a Vitest test remains the cheapest and clearest mechanism when the
  behaviour under test is isolable. The rendering context is the escalation
  path, not the default.
- **AI-first workflow.** Regression modes that AI-generated template edits can
  plausibly introduce (ignored return value, dropped gate, swapped element) must
  be covered by tests that run without human interpretation of a build artefact.
- **Small blast radius for experimental APIs.** The Astro Container API is
  `experimental_`-prefixed. Exposing the API at one grep-visible site minimises
  the surface to update when Astro renames or stabilises the export.

### Evaluated approaches

1. **Status quo — pure utility + client-script tests only.** Rejected. Leaves
   the template-regression modes uncovered. The task's Acceptance #5 (fallback
   DOM assertion) and #6 (eyebrow suppression) cannot be honoured mechanically.
2. **Scripted build-output snapshots.** Generate `dist/*.html` under a Vitest
   test fixture and assert on snapshot diffs. Rejected. Snapshot fixtures churn
   on every unrelated markup change; a content-hashed asset URL in the `<head>`
   invalidates every fixture; reviewing snapshot diffs reintroduces the exact
   commit-review-as-mitigation shape this ADR is meant to retire.
3. **Pre/post-build HTML-DOM diff as a scripted check.** Treat the D-4(b)
   Regression-Nachweis step as a committed script rather than a PR-body
   artefact. Rejected. The check still depends on two full `pnpm build` runs and
   a maintained block-extractor; it catches template regressions on the live
   Services page but cannot be run over arbitrary `ProcessSteps` input
   combinations at the unit level.
4. **Playwright Component Testing.** Rejected. Playwright is a second runtime
   alongside Vitest, duplicates the Vite-pipeline alignment ADR-0016 already
   uses, and adds browser-launch overhead for tests that assert on server-
   rendered static HTML.
5. **Astro Container API (`experimental_AstroContainer` from
   `astro/container`).** Chosen. First- party Astro API for rendering an
   `.astro` component to a string in a test context. Integrates with the
   existing Vitest + jsdom configuration. No new runtime. Scope is exactly the
   regression class the task faces.

## Decision

Sanction the Astro Container API as the project pattern for component-level DOM
tests where pure-function extraction is insufficient to cover a
template-regression mode.

### Scope

The pattern applies when **both** conditions hold:

1. The component has template behaviour whose correctness is a function of Props
   (or slot payloads) and the rendered DOM — not a function whose output can be
   isolated into a helper without duplicating the template path.
2. A plausible AI-generated or manual edit could leave the helper and the
   template structurally intact yet silently wrong (ignored return value,
   dropped gate, swapped element type).

When only the first condition is argued but the second is not (e.g., the
behaviour is trivially localised to a single expression with no plausible
regression mode), pure-helper testing remains the default.

### Conventions

- **Co-location.** Component-test files sit next to the component:
  `ProcessSteps.astro` → `ProcessSteps.test.ts` in the same directory, matching
  the ADR-0016 rule for utility tests.
- **Vitest configuration.** The project's `vitest.config.ts` uses
  `getViteConfig()` from `astro/config` so `.astro` imports are transformed by
  Astro's Vite pipeline and the Container API resolves correctly. The
  `getViteConfig` wrapper is the project convention; plain `defineConfig` from
  `vitest/config` is insufficient because it omits Astro's `.astro` transform
  and the test files that import `.astro` modules would fail to load before
  assertions run.
- **Shared render helper.** A single file — `src/test-utils/renderAstro.ts` —
  wraps `experimental_AstroContainer.create()` and exports a `renderAstro`
  function. Every component test imports this helper; no test imports the
  Container API directly. The grep target
  `rg "experimental_AstroContainer|astro/container" src/` must resolve to
  exactly one file. The helper derives its component-parameter type structurally
  from `Parameters<experimental_AstroContainer['renderToString']>[0]` rather
  than importing `AstroComponentFactory` from `astro/runtime/server/index.js`;
  the runtime path is a deep catch-all under `astro/package.json` `exports`
  (`./runtime/*`), not a pinned public entry, and the structural derivation
  eliminates one maintenance point.
- **Environment pragma.** Each component-test file starts with
  `/** @vitest-environment jsdom */`, matching the existing
  `src/scripts/*.test.ts` controller-test convention.
- **Assertions.** DOM structure and meaning-relevant attributes (element
  presence, `href`, `aria-*`, visible text content). No snapshot tests; Astro
  version bumps routinely churn whitespace in the rendered string, and the
  structural assertion is the actual contract.
- **Scope per component.** A component test covers the regression modes the
  component's Props and slots can produce — not every rendered detail. Tests
  that mirror the template line by line become churn-heavy without adding
  coverage.

### Relationship to ADR-0016

ADR-0016 is extended, not replaced. Its "Out of Scope: Component tests" boundary
is narrowed: component tests with a rendering context are in scope when they
follow the conventions above. The ADR-0016 rules on co-location, test naming,
and CI integration (`pnpm test:run`) continue to apply.

### What does NOT change

- Pure-helper tests remain the first choice whenever the behaviour under test is
  isolable — cheaper, faster, and clearer than rendering the component.
- Utility tests in `src/utils/` and controller tests in `src/scripts/` are
  unaffected; this ADR adds a new pattern alongside them.
- The `satisfies Record<>`, named-export, and `readonly` array-Prop conventions
  (CONVENTIONS.md, ADR-0013, Critical Rule 6) are unchanged.

## Consequences

### Positive

- Mechanical coverage of template-regression modes that pure-helper tests cannot
  reach.
- AI-first-aligned: a failing test — not a reviewer catching a diff — is the
  defence against AI-generated regressions.
- Opens the path for the Service-Detail-Page initiative and future component
  work without forcing each task to re-decide the pattern.
- One grep-visible import site for the experimental API (`renderAstro.ts`) — the
  rename cost when Astro stabilises the export is a single file.

### Negative

- `experimental_`-status of the API. Astro may rename the export or change its
  signature in a major release. Accepted maintenance point; mitigated by the
  single-file import site above.
- Component tests run slower than pure-function tests (rendering overhead, jsdom
  environment). Acceptable at selective use.
- A second test pattern alongside pure-helper tests. The convention above
  requires tests to pick the right level, which is a reviewer discretion point.
- Structural dependency on Astro's Vite pipeline via `getViteConfig()`. If Astro
  reorganises `astro/config` exports in a future major, the Vitest configuration
  breaks alongside the helper — the mitigation is a single `vitest.config.ts`
  change, but the breakage surface is now two files rather than one.

### Risk mitigation

- **API churn in a future Astro major.** `renderAstro.ts` is the only site
  importing `astro/container`. When the export signature changes, the update is
  one file plus a dependency bump. The component-parameter type is derived
  structurally from the public `experimental_AstroContainer['renderToString']`
  signature rather than from the deep `astro/runtime/server/index.js` path, so a
  `./runtime/*` reshape does not force an update here.
- **Pattern overuse.** Component tests added where a pure-helper test would
  cover the same behaviour are a code-review finding, not a blocker — the ADR's
  two-condition scope above is the arbitration rule.

## References

- The SectionHeader render-and-trim fix
  (`fix(section-header): detect empty default slot via render-and-trim`) — a
  prior template-regression-class incident that was addressed at the contract
  boundary rather than via manual checks; illustrates why structural coverage
  beats reviewer discipline for template regressions. See also
  [ADR-0036](0036-content-aware-slot-detection-in-forwarded-slots.md), which
  codifies the render-and-trim pattern as the stable companion artefact.
- [ADR-0016](0016-use-vitest-for-unit-testing.md) — Vitest as the unit test
  runner; extended by this ADR.
- [ADR-0034](0034-extract-first-for-ai-assisted-development.md) — extract-first
  composition; component tests attach to extracted components, reinforcing the
  typed-boundary discipline.
- [Astro Container API reference](https://docs.astro.build/en/reference/container-reference/)
  — upstream documentation for `experimental_AstroContainer`.
- [Astro `getViteConfig()` reference](https://docs.astro.build/en/recipes/testing/)
  — upstream documentation for the Vitest integration used by the project's
  `vitest.config.ts`.
- `docs/work/2026-04-24-services-how-it-works-cross-reference/01-requirements.md`
  — D-9 (revised): Project-Owner decision to adopt this pattern for the
  compact-variant task.
- `docs/work/2026-04-24-services-how-it-works-cross-reference/02-concept-review.md`
  — Major 3: the review finding that triggered the D-9 revision.
