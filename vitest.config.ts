import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts: the tests only cover pure modules, so they
// don't need the Vue / Vuetify / devtools plugins.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/__tests__/*.test.ts'],
  },
})
