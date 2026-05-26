/**
 * Stryker mutation-testing configuration.
 *
 * Stryker is an on-demand diagnostic, not a gate. Run `pnpm test:mutation` to
 * exercise the positive-listed files; see `docs/CONVENTIONS.md` § Mutation
 * Testing (Stryker) for the inclusion criterion and the reading-findings
 * guidance, and ADR-0058 for the decision substance.
 *
 * The `mutate` array is an explicit positive list of `src/data/*.ts` files
 * whose own logic carries enough behaviour to deserve a mutation-score reading
 * — the project's explicit-over-implicit posture (ADR-0017, ADR-0050) extended
 * to the mutation-test surface. Adding a file later is one line; removing one
 * is one line. A new content-only file under `src/data/` is a no-op by
 * construction.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  mutate: ['src/data/services.ts', 'src/data/successStories.ts'],
  // Stryker's default plugin-discovery glob `@stryker-mutator/*` does not
  // match the symlinked `node_modules/.pnpm/@stryker-mutator+...` layout pnpm
  // produces, so checker and test-runner plugins must be listed explicitly.
  // See https://stryker-mutator.io/docs/stryker-js/configuration/#plugins-string.
  plugins: ['@stryker-mutator/typescript-checker', '@stryker-mutator/vitest-runner'],
  testRunner: 'vitest',
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.stryker.json',
  reporters: ['html', 'progress', 'clear-text'],
  htmlReporter: {
    fileName: 'reports/mutation/index.html',
  },
  // No numeric mutation-score threshold. The score is read, not enforced;
  // turning a diagnostic into a gate at this cost shape would either be
  // routinely bypassed or slow iteration to a halt (see ADR-0058 § Context).
  thresholds: { high: 100, low: 100, break: null },
  coverageAnalysis: 'perTest',
};
