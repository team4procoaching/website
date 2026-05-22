/**
 * Lighthouse CI configuration — Mobile form factor.
 *
 * `@lhci/cli@0.15.1`'s config loader flattens any single config file to exactly
 * one `collect` / one `assert` / one `upload`, and the `assert` step has no
 * form-factor axis. Mobile and Desktop therefore live in two separate config
 * files, each run by its own `lhci autorun`. This file carries the Mobile
 * collect (default Slow-4G + 4x CPU throttling) and the Mobile assertion
 * thresholds. The Desktop counterpart is `lighthouserc.desktop.cjs`.
 *
 * The four resource-transfer budgets are shared with the Desktop config and
 * live in `lighthouserc.shared.cjs`; they are `require()`d here and spread into
 * `assert.assertions`.
 *
 * `.cjs` extension: the project's `package.json` declares `"type": "module"`,
 * and the LHCI loader `require()`s the config file synchronously. Run locally
 * with `pnpm exec lhci autorun --config=lighthouserc.cjs` against a built
 * `dist/`.
 *
 * The gate is explicit-only — no `preset`. The `assert` block carries exactly
 * the named assertions below: 4 category scores, 4 Core Web Vitals, and the 4
 * shared resource budgets — 12 assertions, and no other Lighthouse audit is
 * gated. The long tail of individual audits is covered indirectly, at
 * aggregate level, by the four `categories:*` assertions.
 *
 * The `categories:performance` floor is GHA-recalibrated. The Win11 baseline
 * measured TBT 0 ms on every URL — a fast unthrottled host never blocks the
 * main thread long enough to register — but the GHA runner's 4x CPU throttle
 * on shared hardware produces a real nonzero TBT floor even for a near-zero-JS
 * Astro page, which drags the homepage Performance score below the Win11
 * baseline. The floor is set to the measured GHA figure minus margin.
 *
 * The `total-blocking-time` value below (650) is the **nightly** budget. TBT is
 * the most run-variable Lighthouse metric, so the `pull_request` run overrides
 * it `off` (`--assert.assertions.total-blocking-time=off` in `lighthouse.yml`)
 * — a single PR sample of TBT is too noisy for an ERROR gate. The nightly /
 * `workflow_dispatch` run carries no override and asserts the 650 ms floor
 * against its 3-run median.
 *
 * Budgets are baseline-defended against `main@08f317b` (Lighthouse 12.6.1),
 * with `categories:performance` and `total-blocking-time` recalibrated against
 * the first GHA run. See ADR-0053 for every threshold's rationale and the
 * planned amendments.
 */

const { resourceBudgetAssertions } = require('./lighthouserc.shared.cjs');

/** The canonical 9-URL audit set, identical to `lighthouserc.desktop.cjs`. */
const urls = [
  '/',
  '/services/',
  '/coaches/',
  '/success-stories/',
  '/how-it-works/',
  '/contact/',
  '/services/competition-prep/',
  '/services/posing/',
  '/success-stories/sarah-m/',
];

module.exports = {
  ci: {
    collect: {
      staticDistDir: 'dist',
      url: urls,
      numberOfRuns: 3,
    },
    assert: {
      // Explicit-only — no `preset`. The gate is exactly the assertions named
      // below; no other Lighthouse audit is gated.
      assertions: {
        // Category scores — Mobile, ERROR-mode from day one. The Performance
        // floor is GHA-recalibrated (see the JSDoc header).
        'categories:performance': ['error', { minScore: 0.78 }],
        'categories:accessibility': ['error', { minScore: 0.85 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        // Core Web Vitals — Mobile (Slow-4G + 4x CPU throttling). Each metric
        // carries a single ERROR threshold; the Google "Good" targets
        // (2500ms LCP / 1800ms FCP) are documented improvement goals the ERROR
        // floor tightens toward over time via an ADR amendment — not asserted.
        'largest-contentful-paint': ['error', { maxNumericValue: 3500 }],
        'first-contentful-paint': ['error', { maxNumericValue: 3000 }],
        // Nightly budget. The `pull_request` run overrides this `off` via
        // `--assert.assertions.total-blocking-time=off` (see the JSDoc header).
        'total-blocking-time': ['error', { maxNumericValue: 650 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        // Four shared resource-transfer budgets — see lighthouserc.shared.cjs.
        ...resourceBudgetAssertions,
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
