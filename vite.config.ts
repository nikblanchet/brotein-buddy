import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local if it exists (for worktree-specific port configuration)
dotenv.config({ path: '.env.local' });

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: parseInt(process.env.VITE_PORT || '5173'),
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },
});
