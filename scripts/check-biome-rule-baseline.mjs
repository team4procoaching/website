/**
 * CI canary: asserts the empirical-evidence rule-existence baseline recorded
 * in ADR-0041 against the installed Biome binary.
 *
 * What this script verifies:
 *   For each of the six rules in ADR-0041's empirical-evidence table, run
 *   `biome explain <rule>` and assert the exit code matches the recorded
 *   disposition (rule recognised → exit 0; rule unrecognised → non-zero).
 *
 * What this script does NOT verify:
 *   Behavioural parity with the ADR's "exists but does not fire on CSV
 *   target" or "exists but autofix breaks typecheck" claims. Those require
 *   running `biome lint` against fixture files representative of each CSV
 *   target shape — recorded as a future canary extension in ADR-0041's
 *   Risk-Mitigation section.
 *
 * Why this exists:
 *   Renovate auto-merges Biome patch/minor updates. A future Biome version
 *   that resurfaces a "Drop" rule or removes an "exists" rule would
 *   silently invalidate ADR-0041's empirical table. This canary turns that
 *   maintenance obligation into a fail-closed CI signal — the upgrade PR
 *   breaks before merge.
 *
 * Exit code 0 = baseline matches; 1 = drift detected (with diagnostic
 * pointing at ADR-0041 for re-validation).
 *
 * Cross-platform: invoked via `node` against the resolved JS entry point of
 * the Biome binary, so behaves identically on Windows, macOS, and Linux.
 *
 * Layout:
 *   The pure-logic functions (BASELINE, matchesExpectation, formatActual)
 *   live in `./biome-rules/baseline.mjs` so they can be unit-tested without
 *   subprocess access. This file keeps the I/O wiring (resolveBiomeEntry,
 *   runBiomeExplain) and the runner block.
 *
 * Usage:
 *   node scripts/check-biome-rule-baseline.mjs
 *   pnpm check:biome-rules
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { BASELINE, formatActual, matchesExpectation } from './biome-rules/baseline.mjs';

const require = createRequire(import.meta.url);

const ADR_PATH = 'docs/adr/0041-sonarlint-connected-mode-local-prevention.md';

/**
 * Resolves the absolute path to the Biome CLI's JS entry point. Invoking it
 * via `node <path>` avoids shell quoting and the .cmd/.ps1 shim lookup that
 * varies between Windows and POSIX.
 */
function resolveBiomeEntry() {
  return require.resolve('@biomejs/biome/bin/biome');
}

/**
 * Runs `biome explain <rule>` and returns { exitCode, output }.
 * Output combines stdout and stderr because Biome writes the
 * "Unrecognized option" diagnostic to stderr.
 */
function runBiomeExplain(biomeEntry, rule) {
  const result = spawnSync(process.execPath, [biomeEntry, 'explain', rule], {
    encoding: 'utf-8',
    shell: false,
  });
  if (result.error) {
    return { exitCode: -1, output: `spawn error: ${result.error.message}` };
  }
  const exitCode = typeof result.status === 'number' ? result.status : -1;
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  return { exitCode, output };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const biomeEntry = resolveBiomeEntry();
const results = [];

for (const entry of BASELINE) {
  const { exitCode, output } = runBiomeExplain(biomeEntry, entry.rule);
  const pass = matchesExpectation(entry.expectedExit, exitCode, output);
  results.push({ entry, exitCode, output, pass });
}

const failures = results.filter((r) => !r.pass);

console.log('Biome rule-baseline canary (ADR-0041 empirical-evidence table)');
console.log('---------------------------------------------------------------');
for (const r of results) {
  const marker = r.pass ? 'PASS' : 'FAIL';
  const expected = r.entry.expectedExit;
  const actual = formatActual(r.exitCode);
  console.log(`  [${marker}] ${r.entry.rule}  expected=${expected}  actual=${actual}`);
}
console.log('');

if (failures.length === 0) {
  console.log(`All ${results.length} rules match the ADR-0041 baseline.`);
  process.exit(0);
}

console.error(
  `Drift detected: ${failures.length} of ${results.length} rules deviate from baseline.`,
);
console.error('');
for (const r of failures) {
  console.error(`  rule: ${r.entry.rule}`);
  console.error(`    expected: ${r.entry.expectedExit}`);
  console.error(`    actual:   ${formatActual(r.exitCode)}`);
  console.error(`    adr row:  ${r.entry.adrDisposition}`);
  console.error(`    note:     ${r.entry.note}`);
  const snippet = r.output.replaceAll(/\s+/g, ' ').trim().slice(0, 200);
  if (snippet.length > 0) {
    console.error(`    output:   ${snippet}`);
  }
  console.error('');
}
console.error(`Re-validate the empirical-evidence table in ${ADR_PATH}`);
console.error("and update either the table or this script's BASELINE before merging.");
process.exit(1);
