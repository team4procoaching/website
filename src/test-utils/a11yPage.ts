/**
 * Accessibility assertion helper for page-layer tests (ADR-0057).
 *
 * Given a Playwright {@link Page} driving a fully rendered route, this helper
 * fails the surrounding Playwright test if axe-core reports any WCAG 2.1 AA
 * violation. It is one of the two sanctioned axe **execution sites** — the
 * page-layer counterpart to `src/test-utils/a11y.ts`. Both call `axe.run(...)`;
 * the shared option-building and violation-formatting live in
 * `src/test-utils/a11yCore.ts`, which carries axe-core **types only** and runs
 * no scan. `rg "axe-core" src/` therefore matches three files (these two
 * execution sites plus the type-only core), but the invariant tracks the two
 * execution sites.
 *
 * ## Why axe runs *inside* the page realm
 *
 * The helper resolves the pinned `axe-core@4.11.4`'s `axe.min.js` bundle path
 * via Node's ESM `import.meta.resolve('axe-core/axe.min.js')` (the
 * `"type": "module"` package shape makes the synchronous ESM form the natural
 * choice), then injects it into every `Page` it scans via
 * `page.addScriptTag({ path })` before calling `page.evaluate(...)` against
 * `window.axe.run(document, opts)`. The realm-injection is load-bearing,
 * not incidental: axe-core run from the Node realm would walk the DOM through
 * the Node realm's `instanceof` checks, while a Playwright-controlled page
 * realm owns its own `Node`/`Element` constructors — cross-realm `instanceof`
 * checks can fail or behave inconsistently. Injecting `axe.min.js` into the
 * page realm makes axe and the DOM it inspects share one realm, sidestepping
 * the clash. This mirrors `src/test-utils/a11y.ts`'s JSDOM-realm-injection
 * pattern at the page layer; the two helpers are structurally symmetric so a
 * future reader of either file recognises the pattern from the other.
 *
 * The single-pinned-`axe-core` invariant is held by construction: this
 * helper resolves the same `axe-core` package the component layer imports
 * (`node_modules/axe-core`), so an `axe-core` bump moves both layers in one
 * `package.json` edit. No transitive `axe-core` is introduced.
 *
 * ## Rule set
 *
 * axe runs under WCAG 2.1 AA tags (`wcag2a`, `wcag2aa`, `wcag21a`,
 * `wcag21aa`) — identical to the component layer. Unlike
 * {@link ../a11y.ts}'s `BASELINE_DISABLED_RULES`, the page-layer baseline
 * disables *nothing*: the eight document-composition rules the component
 * layer disables as fragment artefacts (`region`, `landmark-one-main`,
 * `page-has-heading-one`, `html-has-lang`, `html-lang-valid`, `bypass`,
 * `document-title`, `meta-viewport`) are *legitimate* at the page layer and
 * stay enabled. Per-call `disableRules` extend the empty page-layer baseline.
 *
 * @example
 * ```typescript
 * import { test } from 'playwright/test';
 * import { expectPageNoA11yViolations } from '~/test-utils/a11yPage';
 *
 * test('home page is a11y-clean', async ({ page }) => {
 *   await page.goto('/');
 *   await expectPageNoA11yViolations(page);
 * });
 * ```
 */
import { fileURLToPath } from 'node:url';
import type { AxeResults, RunOptions } from 'axe-core';
import { expect, type Page } from 'playwright/test';
import { buildRunOptions, formatViolations } from '~/test-utils/a11yCore';

/**
 * Minimal typed surface of the axe instance injected into the page realm via
 * {@link https://playwright.dev/docs/api/class-page#page-add-script-tag | page.addScriptTag}.
 * The page-realm `window.axe` is otherwise untyped from Node's perspective;
 * this shape restores type safety on the `run` call and its `AxeResults`
 * return value when consumed inside `page.evaluate(...)`.
 */
type PageRealmAxe = {
  run(context: Document, options: RunOptions): Promise<AxeResults>;
};

/**
 * Project-wide baseline of axe rules disabled at the page layer.
 *
 * The page-layer baseline is empty by design: the eight document-composition
 * rules that `src/test-utils/a11y.ts` disables as fragment-rendering
 * artefacts (`region`, `landmark-one-main`, `page-has-heading-one`,
 * `html-has-lang`, `html-lang-valid`, `bypass`, `document-title`,
 * `meta-viewport`) are *re-enabled* here because a full page legitimately
 * carries the `<html>`, `<title>`, `<main>`, viewport-meta, and skip-link
 * structure those rules require.
 *
 * A future page class that genuinely warrants a baseline disable would route
 * the rule-set change through a new ADR rather than mutating this constant
 * ad hoc.
 */
const BASELINE_DISABLED_RULES: readonly string[] = [];

/** Options accepted by {@link expectPageNoA11yViolations}. */
type A11yPageOptions = {
  /**
   * Additional axe rule ids to disable for this call, on top of the (empty)
   * page-layer {@link BASELINE_DISABLED_RULES} baseline. Each per-test
   * disable must carry an inline single-line justification comment
   * immediately above the call (mirrors the component-layer convention from
   * ADR-0052 § Decision point 4).
   */
  disableRules?: readonly string[];
};

/**
 * Resolved absolute path to the pinned `axe-core@4.11.4`'s `axe.min.js`
 * bundle. Resolved once at module load via the ESM form because the project
 * declares `"type": "module"`. The bundle ships in `axe-core`'s published
 * `files` list, so the subpath import is stable across version bumps.
 */
const AXE_SCRIPT_PATH = fileURLToPath(import.meta.resolve('axe-core/axe.min.js'));

/**
 * Assert that the given Playwright {@link Page} has no axe-core WCAG 2.1 AA
 * violations.
 *
 * Injects the pinned `axe-core@4.11.4`'s `axe.min.js` bundle into the page
 * realm via {@link https://playwright.dev/docs/api/class-page#page-add-script-tag | page.addScriptTag},
 * then runs axe against the live document through `page.evaluate(...)`.
 *
 * @param page - Playwright `Page` already navigated to the route under test.
 * @param options - Optional per-call rule disables (see {@link A11yPageOptions}).
 */
async function expectPageNoA11yViolations(
  page: Page,
  options: A11yPageOptions = {},
): Promise<void> {
  // Inject axe-core's self-contained bundle into the page realm so axe and
  // the DOM it inspects share one realm — see the file-level realm-injection
  // note.
  await page.addScriptTag({ path: AXE_SCRIPT_PATH });

  const runOptions = buildRunOptions(BASELINE_DISABLED_RULES, options.disableRules ?? []);
  const results = await page.evaluate(
    (opts) => (globalThis as unknown as { axe: PageRealmAxe }).axe.run(document, opts),
    runOptions,
  );

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

export { expectPageNoA11yViolations };
export type { A11yPageOptions };
