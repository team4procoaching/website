/**
 * Playwright runner configuration for page-level accessibility tests
 * (ADR-0057).
 *
 * Scopes the runner to `tests/a11y/` so it stays disjoint from Vitest's
 * `src/**\/*.test.ts` discovery; spec files use the `.spec.ts` extension to
 * reinforce the split. The `webServer` block boots `astro preview` against
 * the prebuilt `dist/` output on Astro's default preview port (`4321`); the
 * Lighthouse CI gate uses its own ephemeral static-server port, so no
 * collision risk.
 *
 * Viewports mirror ADR-0053's Lighthouse collect-preset (Mobile 412×823
 * @ DPR 1.75, Desktop 1350×940) so the two gates share one oracle across
 * the page-level a11y and performance/SEO axes.
 *
 * Chromium-only at day one — the CI workflow installs only chromium
 * (`playwright install --with-deps chromium`); adding `firefox` or `webkit`
 * here without the matching CI install would silently skip or hard-fail by
 * Playwright version.
 *
 * Knob defaults are architect-chosen per the concept's § Playwright
 * Configuration table; any deviation is an implementer-flag-back, not an
 * autonomous decision.
 */
import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: 'tests/a11y',
  retries: 0,
  expect: {
    timeout: 10_000,
  },
  use: {
    actionTimeout: 5_000,
    navigationTimeout: 30_000,
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'pnpm exec astro preview',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'Mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 412, height: 823 },
        deviceScaleFactor: 1.75,
      },
    },
    {
      name: 'Desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1350, height: 940 },
      },
    },
  ],
});
