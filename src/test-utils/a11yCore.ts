/**
 * Layer-agnostic axe-core run-option and violation-formatting helpers shared by
 * both accessibility layers.
 *
 * The two a11y helpers — `src/test-utils/a11y.ts` (component-fragment layer,
 * ADR-0052) and `src/test-utils/a11yPage.ts` (page layer, ADR-0057) — run axe
 * under the same WCAG 2.1 AA tag set and format violations identically. That
 * boring, byte-identical option-building and formatting lives here once; the
 * layer-specific, realm-injection narrative stays in each helper.
 *
 * This module imports axe-core **types only** — no `axe.source`, no default
 * `axe`, no `jsdom`, no `vitest`. It therefore carries no axe *execution* and
 * pulls in no realm dependency, which is what lets the page helper depend on it
 * without inheriting the component layer's JSDOM/Vitest dependency tree.
 *
 * The single-pinned-axe-core invariant is grep-decidable as the **two axe
 * execution sites** where `axe.run(...)` is called: `a11y.ts` (JSDOM realm) and
 * `a11yPage.ts` (page realm). `rg "axe-core" src/` additionally matches this
 * file, which holds axe-core *types only* and runs no scan.
 */
import type { Result, RunOptions } from 'axe-core';

/**
 * WCAG tag set both a11y layers run axe under — WCAG 2.0 A/AA plus WCAG 2.1
 * A/AA. Shared so the two oracles match.
 */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

/**
 * Build the axe `RunOptions` for a single assertion: WCAG 2.1 AA tags plus the
 * caller's baseline rule disables, extended by any per-call `disableRules`.
 *
 * The baseline differs per layer — the component-fragment layer disables eight
 * document-composition rules that would fire false positives on fragments,
 * while the page layer disables nothing — so it is a parameter here, not a
 * constant.
 *
 * @param baselineDisabledRules - The layer's project-wide baseline of disabled
 *   axe rule ids.
 * @param disableRules - Additional per-call rule ids to disable, on top of the
 *   baseline.
 */
export function buildRunOptions(
  baselineDisabledRules: readonly string[],
  disableRules: readonly string[],
): RunOptions {
  const rules: RunOptions['rules'] = {};
  for (const ruleId of [...baselineDisabledRules, ...disableRules]) {
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
 * Shared so failure messages read the same across the two layers.
 */
export function formatViolations(violations: readonly Result[]): string {
  const lines = violations.map((violation) => {
    const ruleLine = `  [${violation.id}] ${violation.help}`;
    const helpUrlLine = `    ${violation.helpUrl}`;
    const nodeLines = violation.nodes.map((node) => `    ${node.html}`);
    return [ruleLine, helpUrlLine, ...nodeLines].join('\n');
  });
  return `axe-core found ${violations.length} accessibility violation(s):\n${lines.join('\n')}`;
}
