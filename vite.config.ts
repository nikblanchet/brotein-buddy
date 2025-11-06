import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [svelte()],
    server: {
      port: parseInt(env.VITE_PORT || '5173'),
    },
    resolve: {
      alias: {
        $lib: path.resolve('./src/lib'),
      },
    },
  };
});
