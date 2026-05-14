/**
 * Supabase client singleton.
 *
 * Reads connection info from Vite env vars at build time. When the vars are
 * missing (e.g. a contributor cloned the repo without configuring
 * `.env.local`) the module exports `null` so the rest of the app can detect
 * a "sync disabled" state and skip every Supabase call. This is preferable
 * to crashing on import.
 *
 * @module lib/supabase
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The configured Supabase client, or `null` if env vars are missing.
 *
 * Callers should treat `null` as "sync is not available in this build" —
 * fall back to the existing LocalStorage-only flow without surfacing an
 * error.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // Persist the session in localStorage so the user stays signed
          // in across reloads. supabase-js handles the storage key.
          persistSession: true,
          // Read the magic-link tokens from the URL on app load and finalize
          // the session automatically; we don't need a dedicated callback
          // route.
          detectSessionInUrl: true,
          // Refresh the access token automatically just before expiry.
          autoRefreshToken: true,
          flowType: 'pkce',
        },
      })
    : null;

/**
 * Convenience for places that need to short-circuit when Supabase isn't
 * configured. Lets callers `if (!isSyncConfigured()) return` without
 * narrowing the SupabaseClient type by hand.
 */
export function isSyncConfigured(): boolean {
  return supabase !== null;
}
