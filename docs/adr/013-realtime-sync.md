# ADR-013: Realtime Sync, Offline Resilience, and Burning Man

**Status:** Accepted

**Date:** 2026-05-14

**Deciders:** Nik Blanchet

---

## Context

### Background

PR 1 (ADR-011) added the local event timeline. PR 2 (ADR-012) added the
Supabase backend, magic-link auth, and a debounced push / pull-on-start
sync coordinator. PR 3 (this ADR) closes out the 3-PR plan: cross-device
realtime, offline resilience, and a persistent dirty bit so the app can
survive extended offline windows without losing data.

### Problem statement

PR 2's coordinator had three gaps that PR 3 must close:

1. **No realtime propagation.** A push from Device A only reached Device B
   on Device B's next manual reload or app boot.
2. **No retry on failure.** A push that failed during a network blip set
   `status='error'` and did nothing else. The next user mutation would
   trigger another push, but if the user stopped editing, the change sat
   on the device until next launch.
3. **Burning Man footgun.** On `INITIAL_SESSION`, the coordinator blindly
   pulled the server snapshot and replaced local. If the user had been
   editing offline for 10 days at Black Rock City and reloaded the app
   mid-trip, all 10 days of offline work would be silently overwritten by
   the stale server pull.

The user explicitly flagged the offline-week scenario as a real
requirement: ~10 days fully offline, sole device, ~30–50 events
accumulated, must reconcile cleanly on reconnect.

## Decision

We will:

1. **Subscribe to Supabase Realtime** on the `events` (INSERT) and
   `app_states` (UPDATE) tables, filtered by `user_id=eq.<current user>`.
   Remote writes trigger a re-pull (Option A in the planning Q&A — chosen
   over a local event-reducer for simplicity and provable correctness).
2. **Persist a sync metadata record** (`BROTEINBUDDY_SYNC_META` in
   LocalStorage) tracking `dirty` (any unsynced local edits since last
   successful push), `lastServerUpdatedAt` (server snapshot timestamp at
   last successful sync), and `lastSyncedAt` (wall-clock display).
3. **Unify INITIAL_SESSION and SIGNED_IN through one reconcile path**
   that uses the meta to decide push / pull / surface-conflict / no-op.
   This closes the Burning Man footgun: a dirty local state can never be
   silently overwritten.
4. **Add push retry with exponential backoff** (cap 60 s). On any push
   failure we enter "offline" mode and stop honouring the per-mutation
   debounce until the retry succeeds or the `online` event fires. This
   prevents battery drain from 2.5 s retry loops on the playa.
5. **Wire `window.online` events** to immediately cancel the backoff
   and try one push. Captive-portal "online" lies are tolerated — if
   the retry fails, we re-enter offline mode.
6. **Add a Sync status badge** to the Inventory header so the user can
   see at a glance whether their last edit reached the server.

### Implementation details

- **Schema migration** (`20260514120000_enable_realtime.sql`): add
  `public.events` and `public.app_states` to the `supabase_realtime`
  publication. RLS still gates which rows a subscriber actually receives.

- **Realtime module** (`src/lib/realtime.ts`): exposes
  `subscribeToRemoteChanges(userId, onChange)` returning an
  `{ unsubscribe }` handle. Internally creates one channel with two
  `postgres_changes` handlers (events INSERT + app_states UPDATE). The
  callback signature is intentionally tiny — the coordinator decides
  what to do with a "something changed" signal.

- **Sync metadata module** (`src/lib/sync-meta.ts`):
  `loadSyncMeta` / `saveSyncMeta` / `clearSyncMeta` operate on a separate
  LocalStorage key. Lives outside `AppState` so we don't need a schema
  bump to remember "dirty".

- **Coordinator state machine** (`src/lib/sync-coordinator.ts`,
  rewritten):
  - `reconcileSync({ treatLocalAsDirty })` is the single decision
    point. Compares `meta.dirty` + `meta.lastServerUpdatedAt` against
    the live peek to choose push / pull / conflict / no-op.
  - SIGNED_IN passes `treatLocalAsDirty: true` because the local store
    might belong to a previous user; any non-empty local state forces
    the conflict path.
  - INITIAL_SESSION passes `treatLocalAsDirty: false` because the meta
    is authoritative for the current user / browser.
  - `schedulePush` short-circuits to "offline" status when
    `isKnownOffline` is true — local mutations still mark dirty but
    don't schedule chatty 2.5 s retries.
  - `scheduleBackoffRetry` doubles the delay each attempt; capped at
    60 s. Cleared on any successful push.
  - `__resetForTests` clears pending timers + the online listener so
    test isolation works (previous tests' setTimeouts were polluting
    the next test's call counts).

- **`pushFullState` signature change**: returns `Promise<string>` (the
  server's new `updated_at`). The coordinator persists this as
  `meta.lastServerUpdatedAt`, which lets the next reconcile detect
  "server changed under us."

- **Sync status badge** (`src/lib/components/SyncStatusBadge.svelte`):
  pill in the Inventory header. Five visual states: synced (green),
  pending (neutral), syncing (animated dot), offline (blue), error (red).
  Clicking opens the Sync modal.

- **Loopback prevention** is implicit: when we push, the server's
  `updated_at` is recorded in meta. The Realtime broadcast for our own
  push triggers a reconcile, which peeks, sees
  `remote.updated_at == meta.lastServerUpdatedAt`, decides "remote not
  fresher" — no pull. Zero extra round-trips for self-loops.

## Consequences

### Positive

- The Burning Man scenario is now safe: 10 days offline editing, reload
  mid-trip, reconnect — all 50 events make it to the server, with the
  user's local state intact throughout.
- Cross-device changes propagate within seconds (Realtime broadcast →
  re-pull → applied to local). No manual reload needed.
- Background backoff retries mean a brief network blip costs at most one
  extra wait cycle, not a silent data loss.
- The single `reconcileSync` path is small and testable. We have 23 unit
  tests covering every decision branch + offline / online transitions.
- The dirty-bit invariant is simple to reason about: "anything that
  changes local sets dirty; only a successful sync clears it."

### Negative

- The Realtime broadcast for our own writes does trigger a reconcile
  (peek + possibly pull). The peek/compare prevents an actual pull in
  the common case, but each push is followed by one extra peek
  round-trip. For our workload (~10 events/day) this is irrelevant; if
  it ever matters we can add a "last push timestamp" filter in the
  realtime callback.
- Two LocalStorage keys to keep coherent (`BROTEINBUDDY_APP_STATE` +
  `BROTEINBUDDY_SYNC_META`). Tests have to clear both.
- `peekRemoteState` is invoked frequently — on every auth event, on
  every realtime trigger, on resolveConflict, on Burning Man recovery.
  It's a single indexed `select … where user_id = …` query so cost is
  negligible, but it's a real network call.

### Neutral

- We chose **Option A** (pull on remote event) over **Option B** (local
  event reducer / CRDT). The senior-architect-at-Google call: simplest
  code that satisfies the workload, with the option to graduate to B
  later confined to a single module (`src/lib/realtime.ts` already
  isolates the apply-strategy boundary).
- Conflict resolution remains the PR 2 chooser modal: keep-local /
  keep-server / cancel. No field-level merge. For a single-user app
  with ~3 devices, the modal fires rarely enough that this is correct.

## Alternatives Considered

### Alternative 1: Event-reducer / Option B

Build a pure `applyEvent(state, event) → state` reducer for each event
type. On a remote event INSERT, apply the event locally instead of
re-pulling.

- **Pros**: Lower latency (no extra round-trip), instant cross-device
  feel.
- **Cons**: ~150 lines of reducer code that must stay in lock-step with
  whatever the server might apply. The reducer needs to handle every
  event type's invariants (e.g., `shake_taken` decrements quantity,
  needs to find the right box, has to handle the case where the box
  doesn't exist locally yet). Bugs in the reducer show up as user-
  visible "my data is wrong" instead of "data is stale for 150 ms".
- **YAGNI**: For one user, ~3 devices, ~10 events/day, the latency
  difference is imperceptible.

Rejected. We deliberately isolated the apply boundary in `realtime.ts`
so the reducer can drop in later without touching the coordinator.

### Alternative 2: CRDT-based merge (the pedantic-professor answer)

Treat the events table as the canonical event log. Local state is a
materialized view computed by replaying events. Use a PN-Counter for
`box.quantity` and LWW-Element-Set for the boxes/flavors collections
with Hybrid Logical Clock timestamps.

- **Pros**: Provably correct under arbitrary concurrent edits. The
  "two devices offline editing the same box" scenario converges
  automatically.
- **Cons**: Massive refactor of every read path. The PN-Counter on
  `quantity` changes the schema. Test surface explodes.
- **Workload mismatch**: True concurrency (two devices simultaneously
  editing the same box while one is offline) approaches zero for a
  personal protein-shake tracker.

Rejected for PR 3. Documented for future reference.

### Alternative 3: `navigator.onLine` as the authoritative offline check

Use the browser's online/offline state as the gate for push attempts.

- **Pros**: Don't have to fail a push to know we're offline.
- **Cons**: `navigator.onLine` is famously unreliable — it returns
  `true` when connected to a captive portal that doesn't actually route
  traffic, which is exactly what Burning Man's spotty wifi looks like.

Rejected. We use `navigator.onLine`'s `online` event as a **signal**
to try a push, not as proof of connectivity. Push success is the only
real online indicator.

### Alternative 4: Persistent push queue separate from AppState

Maintain a separate LocalStorage queue of "events that need to be
pushed," drained on reconnect.

- **Pros**: Explicit model of "unsynced events".
- **Cons**: Redundant — events already live in `AppState.events`. The
  server's `events` table is idempotent by id (PR 1 design), so
  re-pushing the entire `state.events` array on every push is safe and
  cheap. The dirty bit + idempotent push is a strictly simpler model.

Rejected. The "queue" is the dirty bit.

## References

- ADR-002: Data Model Design
- ADR-003: LocalStorage Strategy
- ADR-011: Local Event Timeline (PR 1)
- ADR-012: Supabase-Backed Sync (PR 2)
- Supabase Realtime docs: <https://supabase.com/docs/guides/realtime>
- Postgres logical replication & publications:
  <https://www.postgresql.org/docs/current/logical-replication-publication.html>
- Teaching doc: `docs/teaching/1.8-realtime-and-offline-resilience.md`
