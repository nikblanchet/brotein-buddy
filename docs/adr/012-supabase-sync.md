# ADR-012: Supabase-Backed Sync with Magic-Link Auth

**Status:** Accepted

**Date:** 2026-05-14

**Deciders:** Nik Blanchet

---

## Context

### Background

PR 1 (ADR-011) introduced an append-only event timeline inside `AppState`,
laying the groundwork for multi-device sync. PR 2 (this ADR) makes the
data actually multi-device by introducing a server, an auth system, and a
push/pull sync protocol.

The 3-PR plan from the original design:

1. Local event timeline (ADR-011, shipped).
2. **Server + auth + push/pull sync** (this ADR).
3. Realtime subscribe + offline event queue + conflict resolution.

### Problem statement

The same inventory data needs to be available on multiple devices (phone +
laptop, primarily). The app must:

- Continue to work offline / signed-out exactly as before.
- Offer optional sign-in. Sign-in is the user's signal that they want
  multi-device sync; the local-only path stays intact for users who don't.
- Surface a clear chooser when local and server data collide on a new
  sign-in — neither side gets silently overwritten.
- Push fast enough to feel like "save as you go" but without hammering the
  server on every keystroke.
- Be trivial to undo: a sign-out reverts the device to local-only without
  touching the server.

Out of scope (PR 3): realtime, offline queue, field-level merge.

## Decision

We will use **Supabase** as the backend — Postgres + GoTrue auth + RLS in a
single managed service. Auth is **magic link via email** (passwordless).
Sync is **debounced push, pull on app start, conflict modal on first
sign-in with diverging state**.

### Implementation details

- **Schema (Postgres):** Two tables, both RLS-protected.
  - `app_states` — one row per user. Holds boxes, flavors, favorite,
    settings, version. Overwritten on every push.
  - `events` — append-only timeline. Primary key is the
    client-generated `ev_<uuid>`, so re-pushing an event with the same id is
    a no-op (ON CONFLICT DO NOTHING).

  The split mirrors the client layout (`AppState` snapshot fields vs the
  `events[]` array) and lets PR 3 subscribe to the `events` table in
  realtime without a schema change. SQL lives in
  `supabase/migrations/20260514000000_initial_app_state_and_events.sql`.

- **Auth:** magic link via `supabase.auth.signInWithOtp`. PKCE flow.
  Tokens persist in localStorage so the user stays signed in across reloads.
  The redirect URL is `window.location.origin` — supabase-js parses the
  callback automatically on app load, so we don't need a dedicated
  `/auth/callback` route.

- **Module layout:**
  - `src/lib/supabase.ts` — client singleton. Reads
    `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from Vite env vars.
    Exports `null` when vars are missing so the rest of the app gracefully
    degrades to local-only.
  - `src/lib/auth.ts` — `sendMagicLink`, `signOut`, and a `session`
    readable store hooked to `onAuthStateChange`.
  - `src/lib/sync.ts` — `pushFullState`, `pullFullState`,
    `peekRemoteState`, `clearRemoteState`. Pure functions, no stores.
  - `src/lib/sync-coordinator.ts` — wires everything together. Subscribes
    to auth events and to the `appState` store. Owns debouncing, conflict
    detection, and the sync status / pending-conflict stores.

- **Push semantics:**
  - Debounced by 2.5 s. Coalesces rapid mutations into one round-trip.
  - On every push: upsert the snapshot row, then upsert events (idempotent
    by id). Snapshot is last-write-wins, events are union-merged.
  - Tunable via `setPushDelay(ms)` for tests.

- **Pull semantics:**
  - `INITIAL_SESSION` (page load with cached session): silent pull,
    replace local. Trusts the cached session.
  - `SIGNED_IN` (new sign-in): peek server first.
    - Server empty: push local to seed.
    - Local empty: pull server.
    - Both populated: surface a pending conflict for the UI.

- **Conflict resolution UI (`ConflictResolutionModal.svelte`):** Renders
  whenever `pendingConflict` is non-null. Three actions: _Keep this
  device_ (wipes server, then pushes local), _Keep server_ (pulls,
  replaces local), _Cancel sign-in_ (signs out without touching data).

- **Sync UI (`SyncAccountModal.svelte`):** Lives behind a "Sync" button in
  the Inventory page header, next to the existing "Backup" button. Two
  states: signed-out (email + send-link), signed-in (email, status, sign
  out). Renders a friendly notice when env vars are missing rather than a
  crash.

- **Suppress-outbound flag:** When the coordinator replaces local state
  with server data (pull or `keep-server` resolution), it sets a flag so
  the resulting `appState.subscribe` fire-back doesn't trigger an immediate
  re-push. Without this, a successful pull would push the same data right
  back.

- **Idempotent push design:** Snapshot upserts by `user_id` (the primary
  key); events upsert by `id` with `ignoreDuplicates: true`. Re-pushing
  the same payload is safe and cheap (no row writes for unchanged events).

## Consequences

### Positive

- Single managed service for Postgres + auth keeps the moving parts low.
  Vercel handles the static client; Supabase handles everything else.
- Magic link removes a whole class of UX work (password reset, password
  strength, lockout) for a personal app where the cost of a slightly
  slower sign-in is irrelevant.
- The two-table schema lines up with PR 3 in a natural way: events become
  a Realtime subscription source.
- The anon key shipped in the client bundle is safe because RLS enforces
  per-user access. Service-role key is never used client-side.
- The "not configured" graceful degradation means contributors who clone
  the repo without filling in env vars get a working local app — they
  just can't sync.

### Negative

- Adds a runtime dependency on Supabase availability. If Supabase is down
  for signed-in users, the indicator goes to "error" but the local app
  keeps working. Acceptable for personal use; would need an offline
  queue for higher reliability (PR 3).
- Every snapshot push re-serializes the entire `app_states` row. With a
  small inventory this is fine; the row size is unbounded in theory.
- The conflict modal is blocking and synchronous: once it appears, no
  pushes happen until the user resolves. A power user with rapid
  sign-in/sign-out cycles could find this jarring; not expected in normal
  use.

### Neutral

- The chosen "snapshot last-write-wins, events union-merge" semantics
  mean a user who edits inventory on Device A while Device B is offline
  will lose Device A's edits if Device B pushes a stale snapshot after
  reconnecting. PR 3 will fix this via realtime + offline queue.
- Pushing on every mutation rather than batching across feature
  transactions means even ephemeral state (e.g. the user is mid-add) goes
  to the server. That's fine: the snapshot is always the authoritative
  current state, and there's no concept of "draft" inventory.

## Alternatives Considered

### Alternative 1: Vercel Postgres + Auth.js (NextAuth)

Stay entirely on Vercel: serverless functions in `/api`, Postgres via
Vercel Postgres or Neon, Auth.js for the magic-link flow.

- **Pros:** Single cloud bill, single dashboard, no second provider.
- **Cons:** Significantly more glue code. Auth.js + serverless + Postgres
  setup is several days of plumbing for what Supabase ships out of the
  box. RLS-equivalent isolation has to be enforced in API handlers,
  which is more code to audit.

Rejected. Supabase's all-in-one model is a better fit for a personal
project.

### Alternative 2: Firebase / Firestore

Google's managed NoSQL with built-in auth (Apple/Google sign-in).

- **Pros:** Excellent offline sync story; first-class Apple sign-in.
- **Cons:** Document model doesn't match the project's normalised schema
  without restructuring. Vendor lock-in is heavier; SQL escape hatch is
  not available.

Rejected. Not worth the schema reshaping.

### Alternative 3: Single JSONB row schema

One row per user, one JSONB column holding the entire `AppState`.

- **Pros:** Dead-simple push/pull (one upsert, one select).
- **Cons:** PR 3 wants realtime subscriptions on events, which works much
  better with a real events table. Migrating later is more work than
  splitting now.

Rejected.

### Alternative 4: Required sign-in on first launch

Lock the app behind sign-in to simplify the sync model.

- **Pros:** No "is this device synced?" ambiguity.
- **Cons:** Changes the everyday UX of an app whose daily-use mode has
  always been "open and tap." Loses the local-only escape hatch entirely.

Rejected. Sign-in stays optional, in Settings.

### Alternative 5: Event-by-event sync (skip the snapshot push)

Stream events to the server one by one; derive the snapshot server-side
by replaying.

- **Pros:** Elegant; the event log is the only source of truth.
- **Cons:** Read performance hits O(events) for every pull. With 3-5
  events/day × years, the log grows large enough to want compaction.
  Pushing snapshots is dumber but faster and keeps PR 2 scoped.

Rejected for PR 2. PR 3 may revisit if compaction matters.

## References

- ADR-002: Data Model Design
- ADR-003: LocalStorage Strategy
- ADR-010: Backup/Restore Design
- ADR-011: Local Event Timeline (PR 1)
- Supabase Auth docs: <https://supabase.com/docs/guides/auth>
- Supabase Row Level Security: <https://supabase.com/docs/guides/auth/row-level-security>
- Teaching doc: `docs/teaching/1.7-supabase-magic-link-sync.md`
