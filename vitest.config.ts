import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Note: Integration tests are currently deferred due to @testing-library/svelte v5.2.8
// compatibility issues with Svelte 5 runes. The test pattern includes tests/integration/**
// to support future integration tests once library support is added.
// See tests/integration/README.md for details.

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.config.*', '**/*.d.ts', '**/index.html'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      $lib: '/src/lib',
    },
  },
});
