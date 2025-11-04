import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

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
