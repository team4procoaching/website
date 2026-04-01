// @ts-check

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

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
  ],
});
