/**
 * Accessibility assertion helper for component-layer tests (ADR-0052).
 *
 * Given an HTML string — typically the output of {@link renderAstro} — this
 * helper fails the surrounding Vitest test if axe-core reports any WCAG 2.1 AA
 * violation. It is the single sanctioned `axe-core` call site in the project;
 * `rg "axe-core" src/` resolves to exactly this file.
 *
 * ## Why axe runs *inside* a JSDOM realm
 *
 * The helper constructs a JSDOM instance with `runScripts: 'outside-only'`,
 * evaluates axe-core's bundled source (`axe.source`) inside that realm via
 * `dom.window.eval`, then calls `dom.window.axe.run(...)`. The realm-injection
 * is load-bearing, not incidental: axe-core run from the Node realm walks the
 * DOM through the Node realm's `instanceof` checks and global constructors,
 * while a JSDOM document is built from JSDOM's own `Node`/`Element`
 * constructors — cross-realm `instanceof` checks can fail or behave
 * inconsistently. Injecting `axe.source` into the JSDOM realm makes axe and the
 * DOM it inspects share one realm, sidestepping the clash. This is the same
 * class of realm mismatch ADR-0037 § Conventions documents for the Container
 * API's esbuild module-evaluation step; this file inherits ADR-0037's
 * JSDOM-as-library deviation rather than switching the Vitest environment.
 *
 * The `runScripts: 'outside-only'` constructor option is required — it is what
 * makes `dom.window.eval` functional. With the default `new JSDOM(html)`,
 * `window.eval` is a no-op and the axe-core injection silently fails to define
 * `window.axe`.
 *
 * ## Rule set
 *
 * axe runs under WCAG 2.1 AA tags (`wcag2a`, `wcag2aa`, `wcag21a`,
 * `wcag21aa`). A baseline of fragment-rendering rule disables (see
 * {@link BASELINE_DISABLED_RULES}) is applied because component renders are
 * HTML fragments, not full documents — page-level rules would fire false
 * positives on every assertion. Per-test `disableRules` extend (do not
 * replace) this baseline.
 *
 * ## Limitation — empty HTML resolves vacuously
 *
 * `expectNoA11yViolations('')` resolves without throwing. This is required for
 * the legitimate case where a component renders to empty HTML (e.g.
 * `Accordion` with `items: []`). The side effect: a component that mistakenly
 * produces empty HTML would pass its a11y assertion silently. A test that
 * needs to assert a non-empty render must add a structural assertion (e.g.
 * `expect(parse(html).querySelector(...)).not.toBeNull()`) alongside the a11y
 * assertion.
 *
 * @example
 * ```typescript
 * import { renderAstro } from '~/test-utils/renderAstro';
 * import { expectNoA11yViolations } from '~/test-utils/a11y';
 * import Button from './Button.astro';
 *
 * const html = await renderAstro(Button, { props: { href: '/contact' } });
 * await expectNoA11yViolations(html);
 * ```
 */
import axe, { type AxeResults, type Result, type RunOptions } from 'axe-core';
import { JSDOM } from 'jsdom';
import { expect } from 'vitest';

/**
 * Minimal typed surface of the axe instance injected into the JSDOM realm.
 * `dom.window` carries an `[key: string]: any` index signature, so the
 * realm-bound `axe` is otherwise untyped; this shape restores type safety on
 * the `run` call and its `AxeResults` return value.
 */
type RealmAxe = {
  run(context: Element, options: RunOptions): Promise<AxeResults>;
};

/**
 * WCAG tag set the helper runs axe under — WCAG 2.0 A/AA plus WCAG 2.1 A/AA.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

/**
 * Project-wide baseline of axe rules disabled for every assertion.
 *
 * These rules assume a full HTML document. Component tests render isolated
 * fragments via the Container API, so each of these would fire a false
 * positive on every assertion:
 *
 * - `region` — content must sit inside a landmark; a fragment has none.
 * - `landmark-one-main` — exactly one `<main>` per document; a fragment has none.
 * - `page-has-heading-one` — a document must carry an `<h1>`; a fragment need not.
 * - `html-has-lang` — `<html>` needs a `lang`; a fragment has no `<html>`.
 * - `html-lang-valid` — same; no `<html>` element in a fragment.
 * - `bypass` — a page needs a skip link; a fragment is not a page.
 * - `document-title` — a document needs a `<title>`; a fragment has none.
 * - `meta-viewport` — a document needs a viewport meta tag; a fragment has none.
 *
 * A future component class that genuinely renders a full document would route
 * a rule-set change through a new ADR rather than mutating this constant ad hoc.
 */
const BASELINE_DISABLED_RULES = [
  'region',
  'landmark-one-main',
  'page-has-heading-one',
  'html-has-lang',
  'html-lang-valid',
  'bypass',
  'document-title',
  'meta-viewport',
] as const;

/** Options accepted by {@link expectNoA11yViolations}. */
type A11yOptions = {
  /**
   * Additional axe rule ids to disable for this call, on top of the
   * project-wide {@link BASELINE_DISABLED_RULES} baseline. Each per-test
   * disable must carry an inline single-line justification comment
   * immediately above the call (see ADR-0052 § Decision point 4).
   */
  disableRules?: readonly string[];
};

/**
 * Build the axe `RunOptions` for a single assertion: WCAG 2.1 AA tags plus the
 * baseline fragment-rendering disables, extended by any per-call `disableRules`.
 */
function buildRunOptions(disableRules: readonly string[]): RunOptions {
  const rules: RunOptions['rules'] = {};
  for (const ruleId of [...BASELINE_DISABLED_RULES, ...disableRules]) {
    rules[ruleId] = { enabled: false };
  }
  return {
    runOnly: { type: 'tag', values: [...WCAG_TAGS] },
    rules,
  };
}

/**
 * Format an axe violation list into a single human-readable error message,
 * carrying each violation's rule id, help URL, and failing-element snippet.
 */
function formatViolations(violations: readonly Result[]): string {
  const lines = violations.map((violation) => {
    const nodes = violation.nodes.map((node) => `    ${node.html}`).join('\n');
    return `  [${violation.id}] ${violation.help}\n    ${violation.helpUrl}\n${nodes}`;
  });
  return `axe-core found ${violations.length} accessibility violation(s):\n${lines.join('\n')}`;
}

/**
 * Assert that the given HTML string has no axe-core WCAG 2.1 AA violations.
 *
 * Constructs a JSDOM instance from `html`, injects axe-core into that realm,
 * and runs axe against the fragment. Empty HTML resolves vacuously (see the
 * file-level limitation note).
 *
 * @param html - Rendered component HTML, typically from {@link renderAstro}.
 * @param options - Optional per-call rule disables (see {@link A11yOptions}).
 */
async function expectNoA11yViolations(html: string, options: A11yOptions = {}): Promise<void> {
  // Empty HTML carries no DOM to scan — treat as a vacuous pass rather than
  // emitting an axe "no elements" warning. See the file-level limitation note.
  if (html.trim().length === 0) {
    return;
  }

  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  // Inject axe-core's self-contained bundle into the JSDOM realm so axe and the
  // DOM it inspects share one realm — see the file-level realm-injection note.
  dom.window.eval(axe.source);

  const runOptions = buildRunOptions(options.disableRules ?? []);
  const realmAxe = dom.window.axe as RealmAxe;
  const results = await realmAxe.run(dom.window.document.body, runOptions);

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

export { expectNoA11yViolations };
export type { A11yOptions };
