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
    },
  }),
);
