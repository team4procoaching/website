/// <reference types="vitest" />

import { resolve } from 'node:path';
import { getViteConfig } from 'astro/config';
import { defineConfig } from 'vitest/config';

// Use getViteConfig so Astro's Vite plugin chain (including the `.astro`
// transform and the astro/container wiring) is active inside Vitest. Wrapping
// the Vitest-typed config via defineConfig keeps the `test` field typed
// without widening getViteConfig's own signature. See ADR-0037.
export default getViteConfig(
  defineConfig({
    resolve: {
      alias: {
        '~': resolve(__dirname, './src'),
      },
    },
    test: {
      include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
      // Coverage is an on-demand advisory signal, not a gate — never wired into
      // `pnpm check`. The `include` is scoped to the audited surface
      // (`src/data/`) so the reported numbers describe the audit's own scope.
      // See docs/CONVENTIONS.md § Coverage Reporting (Vitest).
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html'],
        include: ['src/data/**/*.ts'],
        exclude: ['src/data/**/*.test.ts'],
        // Calibration anchors, not gate floors — measured 2026-05-29 over
        // `src/data/` (lines 84.09 %, branches 100 %, functions 100 %,
        // statements 85.41 %). Per-metric anchored to ~5 pp below measured
        // where measured cleared the provisional default by more than 5 pp
        // (branches, functions); lines and statements keep the provisional
        // default (measured cleared it by under or just over 5 pp). The
        // content-only data modules (cta.ts, navigation.ts, …) with no
        // behaviour to test hold lines/statements near 84-85 %.
        thresholds: {
          lines: 80,
          branches: 95,
          functions: 95,
          statements: 80,
        },
      },
    },
  }),
);
