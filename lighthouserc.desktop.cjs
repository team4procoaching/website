/**
 * Lighthouse CI configuration — Desktop form factor.
 *
 * `@lhci/cli@0.15.1`'s config loader flattens any single config file to exactly
 * one `collect` / one `assert` / one `upload`, and the `assert` step has no
 * form-factor axis. Mobile and Desktop therefore live in two separate config
 * files, each run by its own `lhci autorun`. This file carries the Desktop
 * collect (`preset: 'desktop'` — 1350x940 screen, desktopDense4G throttling)
 * and the Desktop assertion thresholds. The Mobile counterpart is
 * `lighthouserc.cjs`.
 *
 * The four resource-transfer budgets are shared with the Mobile config and
 * live in `lighthouserc.shared.cjs`; they are `require()`d here and spread into
 * `assert.assertions`, so the same four thresholds are evaluated against the
 * desktop LHRs as well as the mobile LHRs.
 *
 * Run locally with `pnpm exec lhci autorun --config=lighthouserc.desktop.cjs`
 * against a built `dist/`.
 *
 * Budgets are baseline-defended against `main@08f317b` (Lighthouse 12.6.1).
 * Desktop Performance and CLS are deliberately loosened around a pre-existing
 * desktop-specific layout-shift defect on `/success-stories/` and
 * `/how-it-works/`; see ADR-0053 for every threshold's rationale and the
 * planned amendments.
 */

const { resourceBudgetAssertions } = require('./lighthouserc.shared.cjs');

/** The canonical 9-URL audit set, identical to `lighthouserc.cjs`. */
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
      settings: {
        // `desktop` is one of Lighthouse's valid presets (perf / experimental
        // / desktop); it loads `desktop-config.js` — 1350x940 screen,
        // desktopDense4G throttling.
        preset: 'desktop',
      },
    },
    assert: {
      // `lighthouse:no-pwa` as the base; PWA audits are disabled, the rest of
      // the recommended assertion set stays as a warn-level baseline.
      preset: 'lighthouse:no-pwa',
      assertions: {
        // Category scores — Desktop, ERROR-mode from day one. Performance and
        // Accessibility floors are loosened around pre-existing defects.
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.85 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        // Core Web Vitals — Desktop (desktopDense4G). FCP/LCP floors are tight
        // because the measured desktop surface is genuinely fast; CLS is
        // loosened around the pre-existing desktop layout-shift defect.
        'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1200 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.35 }],
        // Four shared resource-transfer budgets — see lighthouserc.shared.cjs.
        ...resourceBudgetAssertions,
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
