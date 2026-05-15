/**
 * Push / pull helpers for the BroteinBuddy sync backend.
 *
 * These functions assume a signed-in session; the caller is responsible for
 * checking auth state first. They translate between the client's `AppState`
 * shape and the two server tables (`app_states` snapshot + `events`
 * append-only log).
 *
 * Pushes overwrite the snapshot and insert any events the server doesn't
 * already have (idempotent by event id). Pulls assemble a full `AppState`
 * from both tables, run it through the schema migration pipeline, and
 * validate against `isAppState` before returning — same defensive posture
 * as `loadState()` in `lib/storage.ts`.
 *
 * @module lib/sync
 */

import { supabase } from './supabase';
import { isAppState, type AppState, createDefaultAppState } from '../types/models';
import type { AppEvent, AppEventType } from '../types/events';
import { migrateState } from './storage';

/**
 * Error raised when a sync operation fails. Wraps the underlying supabase
 * error so callers (mostly the sync coordinator) can surface a clean
 * message in the UI.
 */
export class SyncError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SyncError';
    this.cause = cause;
  }
}

/**
 * Lightweight summary of the server-side state for a user. Used by the
 * sign-in conflict flow to render "the server has X boxes, last change Y"
 * without pulling the full payload.
 */
export interface RemoteStateSummary {
  exists: boolean;
  boxCount: number;
  flavorCount: number;
  eventCount: number;
  updatedAt: string | null;
}

interface AppStateRow {
  user_id: string;
  version: number;
  boxes: unknown;
  flavors: unknown;
  favorite_flavor_id: string | null;
  settings: unknown;
  updated_at: string;
}

interface EventRow {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  event_timestamp: string;
}

function requireClient() {
  if (!supabase) {
    throw new SyncError('Sync is not configured (Supabase env vars missing).');
  }
  return supabase;
}

async function requireUserId(): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new SyncError('No authenticated user. Sign in before syncing.', error);
  }
  return data.user.id;
}

/**
 * Reads just enough remote state to decide whether a conflict exists.
 *
 * Cheap by design — one row + two counts, no event payloads.
 */
export async function peekRemoteState(): Promise<RemoteStateSummary> {
  const client = requireClient();
  const userId = await requireUserId();

  const { data: row, error: rowErr } = await client
    .from('app_states')
    .select('boxes, flavors, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (rowErr) {
    throw new SyncError('Failed to read remote app_state.', rowErr);
  }

  if (!row) {
    return { exists: false, boxCount: 0, flavorCount: 0, eventCount: 0, updatedAt: null };
  }

  const { count: eventCount, error: countErr } = await client
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countErr) {
    throw new SyncError('Failed to count remote events.', countErr);
  }

  return {
    exists: true,
    boxCount: Array.isArray(row.boxes) ? row.boxes.length : 0,
    flavorCount: Array.isArray(row.flavors) ? row.flavors.length : 0,
    eventCount: eventCount ?? 0,
    updatedAt: row.updated_at,
  };
}

/**
 * Downloads the full server state for the current user and assembles it
 * into a valid `AppState`.
 *
 * Returns `null` when the user has no `app_states` row yet (first ever
 * sign-in from a brand-new device). The result is run through the schema
 * migration pipeline so even older server data is upgraded before the
 * caller sees it.
 */
export async function pullFullState(): Promise<AppState | null> {
  const client = requireClient();
  const userId = await requireUserId();

  const { data: snapshot, error: snapErr } = await client
    .from('app_states')
    .select('user_id, version, boxes, flavors, favorite_flavor_id, settings, updated_at')
    .eq('user_id', userId)
    .maybeSingle<AppStateRow>();

  if (snapErr) {
    throw new SyncError('Failed to read remote app_state.', snapErr);
  }

  if (!snapshot) return null;

  const { data: eventRows, error: evErr } = await client
    .from('events')
    .select('id, user_id, type, payload, event_timestamp')
    .eq('user_id', userId)
    .order('event_timestamp', { ascending: true })
    .returns<EventRow[]>();

  if (evErr) {
    throw new SyncError('Failed to read remote events.', evErr);
  }

  const events: unknown[] = (eventRows ?? []).map((row) => ({
    id: row.id,
    timestamp: row.event_timestamp,
    type: row.type,
    ...row.payload,
  }));

  const candidate = {
    version: snapshot.version,
    boxes: snapshot.boxes,
    flavors: snapshot.flavors,
    favoriteFlavorId: snapshot.favorite_flavor_id,
    settings: snapshot.settings,
    events,
  };

  const migrated = migrateState(candidate);
  if (!isAppState(migrated)) {
    throw new SyncError('Server returned data that does not match the AppState schema.');
  }
  return migrated;
}

/**
 * Pushes the full local state up to the server.
 *
 * Steps:
 *   1. Upsert the `app_states` snapshot row (overwrites server snapshot).
 *   2. Insert every event in `state.events`. The events table's primary
 *      key is the client-generated event id, so duplicate inserts are
 *      no-ops — re-pushing the same set is safe.
 *
 * The server snapshot wins for boxes/flavors/favorite/settings; events
 * are union-merged by id. This matches the PR 2 "last-write-wins on the
 * snapshot, append-only on the timeline" sync semantics.
 */
export async function pushFullState(state: AppState): Promise<void> {
  const client = requireClient();
  const userId = await requireUserId();

  const { error: upsertErr } = await client.from('app_states').upsert(
    {
      user_id: userId,
      version: state.version,
      boxes: state.boxes,
      flavors: state.flavors,
      favorite_flavor_id: state.favoriteFlavorId,
      settings: state.settings,
    },
    { onConflict: 'user_id' }
  );

  if (upsertErr) {
    throw new SyncError('Failed to upsert remote app_state.', upsertErr);
  }

  if (state.events.length === 0) return;

  const rows = state.events.map((event) => splitEventForRow(event, userId));

  // `ignoreDuplicates: true` translates to ON CONFLICT DO NOTHING — re-pushing
  // an event with the same id leaves the existing row untouched.
  const { error: evErr } = await client
    .from('events')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

  if (evErr) {
    throw new SyncError('Failed to insert remote events.', evErr);
  }
}

/**
 * Wipes ALL server state for the current user (snapshot + every event).
 *
 * Used by the "Keep this device" branch of the sign-in conflict modal: we
 * clear the server, then push the local state fresh.
 */
export async function clearRemoteState(): Promise<void> {
  const client = requireClient();
  const userId = await requireUserId();

  const { error: evErr } = await client.from('events').delete().eq('user_id', userId);
  if (evErr) {
    throw new SyncError('Failed to delete remote events.', evErr);
  }

  const { error: snapErr } = await client.from('app_states').delete().eq('user_id', userId);
  if (snapErr) {
    throw new SyncError('Failed to delete remote app_state.', snapErr);
  }
}

/**
 * Splits an AppEvent into the column shape expected by the `events` table:
 * shared fields (id, timestamp, type) go to dedicated columns, the rest
 * becomes the JSONB payload.
 */
function splitEventForRow(event: AppEvent, userId: string) {
  const { id, timestamp, type, ...payload } = event as unknown as {
    id: string;
    timestamp: string;
    type: AppEventType;
  } & Record<string, unknown>;
  return {
    id,
    user_id: userId,
    type,
    payload,
    event_timestamp: timestamp,
  };
}

/**
 * Builds a fresh "default" remote state. Helper for tests and for the
 * "first sign-in, server empty" path where we want to start clean.
 */
export function emptyServerState(): AppState {
  return createDefaultAppState();
}
