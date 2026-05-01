/**
 * Pure-logic library for the Biome rule-baseline canary.
 *
 * What lives here:
 *   - BASELINE: the data table mirroring ADR-0041's empirical-evidence rows.
 *   - matchesExpectation(expectedExit, exitCode, output): pure verdict
 *     function deciding whether a probe outcome matches its baseline row.
 *   - formatActual(exitCode): pure formatter for human-readable exit-code
 *     descriptions used in PASS/FAIL summaries and drift diagnostics.
 *
 * What does NOT live here:
 *   - I/O (spawnSync, console output, process.exit). Those stay in the
 *     entry script `scripts/check-biome-rule-baseline.mjs` so this module
 *     is unit-testable without filesystem or subprocess access.
 *
 * Imported by:
 *   - scripts/check-biome-rule-baseline.mjs (CLI runner)
 *   - scripts/biome-rules/baseline.test.mjs (unit tests)
 */

/**
 * Each entry mirrors one row of ADR-0041's empirical-evidence table.
 * - rule: exact identifier `biome explain` accepts.
 * - expectedExit: 'success' (rule recognised, exit 0) or
 *   'unrecognized' (rule rejected, non-zero exit + "Unrecognized" output).
 * - adrDisposition: short label tracking the ADR row.
 * - note: human-readable context for drift diagnostics.
 */
export const BASELINE = [
  {
    rule: 'useGlobalThis',
    expectedExit: 'unrecognized',
    adrDisposition: 'Drop — rule absent at Biome 2.3.10',
    note: 'Resurfaces if Biome ships the rule; re-evaluate the typescript:S7764 mapping.',
  },
  {
    rule: 'useRegexpExec',
    expectedExit: 'success',
    adrDisposition: 'Drop — exists but does not fire on CSV target shape',
    note: 'Existence-only check; behavioural non-firing on JSDoc-typed receivers is not verified here.',
  },
  {
    rule: 'useAtIndex',
    expectedExit: 'success',
    adrDisposition: 'Drop — exists but autofix breaks typecheck',
    note: 'Existence-only check; autofix-typecheck regression is not verified here.',
  },
  {
    rule: 'noNegationElse',
    expectedExit: 'success',
    adrDisposition: 'Drop — exists but semantic mismatch with S7735',
    note: 'Existence-only check; the !== vs !cond gap with the CSV finding is not verified here.',
  },
  {
    rule: 'noExcessiveCognitiveComplexity',
    expectedExit: 'success',
    adrDisposition: 'Defer to refactor — activate with populateCoach rewrite',
    note: 'Existence guarantees the future activation path stays open.',
  },
  {
    rule: 'noNestedTernary',
    expectedExit: 'success',
    adrDisposition: 'Defer to fix — activate with generate-csp-hashes rewrite',
    note: 'Existence guarantees the future activation path stays open.',
  },
];

/**
 * Determines whether a given (exitCode, output) pair matches the expected
 * disposition. For 'unrecognized', we require both a non-zero exit AND the
 * output to mention the unrecognised-option phrasing — a defensive check
 * against a future Biome version that returns non-zero for an unrelated
 * reason while the rule itself becomes recognised.
 *
 * @param {string} expectedExit — 'success' or 'unrecognized'
 * @param {number} exitCode — process exit code (negative for spawn failures)
 * @param {string} output — combined stdout+stderr from the probe
 * @returns {boolean} true when the outcome matches the expectation
 */
export function matchesExpectation(expectedExit, exitCode, output) {
  if (expectedExit === 'success') {
    return exitCode === 0;
  }
  if (expectedExit === 'unrecognized') {
    const lowered = output.toLowerCase();
    const mentionsUnrecognised = lowered.includes('unrecognized') || lowered.includes('unknown');
    return exitCode !== 0 && mentionsUnrecognised;
  }
  return false;
}

/**
 * Formats a process exit code as a human-readable string for summary lines
 * and drift diagnostics. Negative values represent spawn failures (the
 * convention used by the CLI runner when the child process never started).
 *
 * @param {number} exitCode
 * @returns {string} 'success' | 'spawn-failed' | 'non-zero (exit N)'
 */
export function formatActual(exitCode) {
  if (exitCode === 0) return 'success';
  if (exitCode < 0) return 'spawn-failed';
  return `non-zero (exit ${exitCode})`;
}
