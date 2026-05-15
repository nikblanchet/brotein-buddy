/**
 * Magic-link authentication for BroteinBuddy.
 *
 * Wraps Supabase Auth so the rest of the app deals with a small, opinionated
 * surface: send a magic link, observe the session, sign out. The session is
 * exposed as a Svelte store so components can react to sign-in / sign-out
 * with the usual `$session` syntax.
 *
 * @module lib/auth
 */

import { writable, type Readable } from 'svelte/store';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Error thrown when an auth action is attempted but Supabase is not
 * configured for this build (env vars missing).
 */
export class SyncNotConfiguredError extends Error {
  constructor() {
    super('Sync is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    this.name = 'SyncNotConfiguredError';
  }
}

/**
 * Error thrown when Supabase Auth rejects an action (bad email, rate limit,
 * etc). Wraps the underlying message so the UI can surface it.
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

const sessionStore = writable<Session | null>(null);

/**
 * Reactive store of the current Supabase session, or `null` when signed
 * out. Subscribers receive an update whenever the session changes — sign-in
 * via magic link, token refresh, or sign-out.
 *
 * The store is hydrated synchronously on module load with whatever
 * supabase-js has cached in localStorage, then kept in sync via the
 * `onAuthStateChange` subscription.
 */
export const session: Readable<Session | null> = { subscribe: sessionStore.subscribe };

if (supabase) {
  // Hydrate from cache (resolves asynchronously but the store starts at
  // null, which is the right default).
  void supabase.auth.getSession().then(({ data }) => {
    sessionStore.set(data.session);
  });

  supabase.auth.onAuthStateChange((_event, newSession) => {
    sessionStore.set(newSession);
  });
}

/**
 * Sends a magic-link email to `email`. Clicking the link returns the user
 * to the app and supabase-js automatically finalizes the session.
 *
 * Resolves when the email has been queued by Supabase. Throws
 * {@link SyncNotConfiguredError} if env vars are missing or
 * {@link AuthError} on a Supabase error.
 *
 * @param email - The address to send the link to. Trimmed; format validation
 *   is delegated to Supabase.
 */
export async function sendMagicLink(email: string): Promise<void> {
  if (!supabase) throw new SyncNotConfiguredError();

  const trimmed = email.trim();
  if (trimmed.length === 0) {
    throw new AuthError('Email address is required.');
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      // The magic link redirects here; supabase-js parses the URL on load.
      emailRedirectTo: window.location.origin,
      // Don't auto-create accounts is the default; we override to allow it
      // so the first sign-in for a new email seeds an auth.users row.
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw new AuthError(error.message);
  }
}

/**
 * Signs out of Supabase, clearing the cached session.
 *
 * Throws {@link SyncNotConfiguredError} if env vars are missing or
 * {@link AuthError} on a Supabase error.
 */
export async function signOut(): Promise<void> {
  if (!supabase) throw new SyncNotConfiguredError();

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new AuthError(error.message);
  }
}
