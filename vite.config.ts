import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local if it exists (for worktree-specific port configuration)
dotenv.config({ path: '.env.local' });

// Resolve Supabase config from the available env-var aliases. Locally we
// read VITE_SUPABASE_* from .env.local; on Vercel the Supabase integration
// injects SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (along with several
// server-only secrets we deliberately ignore). We safelist by NAME to keep
// SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY / SUPABASE_JWT_SECRET /
// POSTGRES_PASSWORD out of the client bundle — widening Vite's envPrefix
// would expose them all.
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  '';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-512.svg'],
      manifest: {
        name: 'BroteinBuddy',
        short_name: 'BroteinBuddy',
        description:
          'Track your protein shake inventory by flavor and location with weighted random selection',
        theme_color: '#4F46E5',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
    // Bundle size visualization (only in build mode)
    visualizer({
      filename: 'dist/stats.html',
      open: false, // Set to true to auto-open after build
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: parseInt(process.env.VITE_PORT || '5173'),
  },
  define: {
    // Map the resolved Supabase config onto the VITE_SUPABASE_* names the
    // client reads. Empty strings fall through to lib/supabase.ts's
    // "not configured" path, which renders local-only mode without crashing.
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },
  build: {
    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // Vendor chunk for node_modules dependencies
          vendor: ['svelte', 'svelte-spa-router'],
          // DnD library separate chunk (only used on rearrange screen)
          dnd: ['svelte-dnd-action'],
        },
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 250, // Target: < 250KB per chunk (relaxed budget)
    // Source maps for debugging (can be disabled in production for smaller builds)
    sourcemap: false,
  },
});
