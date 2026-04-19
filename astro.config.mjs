// @ts-check

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { generateCspHashes } from './scripts/generate-csp-hashes.mjs';

/**
 * Minimal project-owned Astro integration: after `astro build` finishes,
 * scan `dist/**\/*.html` for inline scripts/styles and rewrite the
 * `Content-Security-Policy` line in `netlify.toml` with their SHA-256 hashes.
 * See ADR-0030 for why hash-based CSP (and why this is project-owned rather
 * than a third-party integration).
 *
 * @returns {import('astro').AstroIntegration}
 */
function cspHashIntegration() {
  return {
    name: 'csp-hash-generator',
    hooks: {
      'astro:build:done': async ({ logger }) => {
        await generateCspHashes({ logger });
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://www.team4procoaching.com',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    sitemap({
      // Keep in sync with src/data/routes.ts — direct import not possible
      // because astro.config.mjs runs outside Vite's module resolution.
      filter: (page) =>
        !['/contact/thanks', '/privacy', '/terms'].some((path) => page.includes(path)),
    }),
    // csp-hash-generator must remain the last integration so its
    // astro:build:done hook sees every inline <script> and <style>
    // emitted by preceding integrations. New integrations go above
    // this line.
    cspHashIntegration(),
  ],
});
