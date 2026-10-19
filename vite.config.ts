/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = import.meta.dirname;

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  // '/' for `npm start`. A static host that serves the app from a sub-folder
  // (GitHub Pages: /<repo>/) sets BASE_PATH at build time.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'FitPower Dashboard',
        short_name: 'FitPower',
        description: 'Self-hosted fitness and home-workout tracker. Runs fully offline.',
        theme_color: '#0E0F13',
        background_color: '#0E0F13',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // webp = the Workout Gallery demo images (public/exercises, ~5 MB across
        // 364 small files), so the gallery works offline after the first load.
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2,webp}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  // App data (localStorage/IndexedDB) is tied to the exact origin, so both
  // ports are strict: a busy port fails loudly instead of Vite silently moving
  // to another one, which would be the same app with none of your saved data.
  //
  // `npm start` (build + preview) is how people run the app day to day, so it
  // gets 5173, the port the old dev-server launcher used: existing data keeps
  // working. The dev server moves to 5174 so development never shares an
  // origin (or a service worker) with the copy that holds real data.
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./src/setupTests.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
