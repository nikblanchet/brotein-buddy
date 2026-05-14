# ADR-011: Local Event Timeline

**Status:** Accepted

**Date:** 2026-05-14

**Deciders:** Nik Blanchet

---

## Context

### Background

BroteinBuddy currently persists a single `AppState` snapshot to LocalStorage. The schema captures _what_ is true now (boxes, flavors, favorite, settings) but not _what happened_: when boxes arrived, when they were opened, when shakes were taken, or which suggestions the user rejected. The backup/restore feature (ADR-010) serializes the snapshot but has no historical content.

We plan to evolve the data layer in three staged PRs:

1. **(this PR) Local event timeline** — capture events client-side in LocalStorage.
2. **Server + auth** — Supabase project with magic-link sign-in; push state and events on login, pull on app start.
3. **Multi-device sync** — realtime subscribe, offline event queue, conflict resolution, sync UI.

This ADR covers PR 1 only.

### Problem Statement

The user wants:

- Visibility into when boxes were received and opened.
- A record of every shake taken — including the _method_ of selection (random pool / manual / favorite).
- A record of "no-transaction" moments — pressing _Different Choice_ (rejecting a suggestion) and _Cancel_.
- A foundation for later reporting ("when do I take shakes?", "which flavors do I skip?") without specifying any UI yet.

The constraints are:

- Stay 100% client-side for this PR. No server, no auth, no network calls.
- Keep the existing backup/restore round-trip working (ADR-010).
- Preserve the migration framework (ADR-003) so users with v2 data upgrade transparently.
- Don't bloat LocalStorage unnecessarily; events grow over time.

## Decision

We will **embed an append-only `events: AppEvent[]` array inside `AppState`** and bump the schema to v3. Six event types capture exactly the user-visible actions enumerated above:

| Type                  | When emitted                                                   |
| --------------------- | -------------------------------------------------------------- |
| `box_received`        | A box is added to inventory (`addBox`)                         |
| `box_opened`          | A box transitions `isOpen: false → true` (`updateBoxIsOpen`)   |
| `box_removed`         | A box is deleted (`removeBox`)                                 |
| `shake_taken`         | Selection confirmed; quantity decremented (`recordShakeTaken`) |
| `shake_rejected`      | User clicked _Different Choice_ (`recordShakeRejected`)        |
| `selection_cancelled` | User clicked _Cancel_ (`recordSelectionCancelled`)             |

Every event has `id` (`ev_<uuid>`), `timestamp` (ISO 8601), and `type`. `shake_*` and `selection_*` events also carry `method: 'random' | 'manual' | 'favorite'` and `pool: 'caffeinated' | 'caffeine-free' | null`.

### Implementation Details

- **Schema**: `events: AppEvent[]` lives on `AppState` directly. The `isAppState` type guard validates the array; each event passes a per-variant `isAppEvent` guard.
- **Migration**: v2 → v3 adds `events: []`. v1 → v3 chains through v1 → v2 → v3 transparently. The migration is idempotent. **No synthetic backfill** for existing boxes — we don't know their true received dates and would rather have an honestly empty timeline than fabricated timestamps.
- **Event factory**: `lib/events.ts` exports a pure `createEvent(type, payload)` factory using `crypto.randomUUID()` and `new Date().toISOString()`. No store coupling.
- **Store integration**: `addBox`, `removeBox`, and `updateBoxIsOpen` emit their events inside the same `appState.update` call as the mutation — one atomic write. Three new actions (`recordShakeTaken`, `recordShakeRejected`, `recordSelectionCancelled`) live alongside the existing box/flavor mutators.
- **Selection flow**: `RandomConfirm.svelte` snapshots `selectedMethod` and `selectedPool` on mount and uses them when emitting events. `Home.svelte` sets `selectedMethod` (new writable in `lib/navigation-state.ts`) for each entry path: `'random' | 'manual' | 'favorite'`.
- **Backup**: No change to `lib/backup.ts`. Events are part of `AppState` so they flow through `exportStateAsJson` / `parseBackupJson` automatically.

## Consequences

### Positive

- The user immediately has an audit trail of selections, rejections, and box lifecycle events, visible in any backup JSON export.
- The event schema is stable before PR 2 introduces server sync, so the server can be designed around it rather than retrofitted.
- Adding new event types in the future is purely additive — no schema bump required as long as `events` stays an array.
- Backup files carry the timeline, so users restoring from a backup keep their history.

### Negative

- LocalStorage write size grows with the event log. At ~10 events/day × 200 bytes/event, ~700 KB/year. Well under the 5–10 MB LocalStorage limit but worth monitoring.
- The auto-save subscription writes the full `AppState` on every event. With many events per session that's measurably more I/O than today, though still synchronous and small.
- The event log is unbounded. We don't truncate or compact. Eventually we may need a rolling window or compaction (likely in PR 3 alongside the offline queue).

### Neutral

- Existing inventory edits via the Inventory page (manual `updateBoxQuantity` and `updateBoxLocation`) do **not** emit events in this PR. We can add them later without a schema change. The plan focuses on the selection timeline you asked for.
- Box close (`isOpen: true → false`) is not recorded. The product question "when did I close this box?" wasn't asked for. Symmetric `box_closed` is trivially addable later.

## Alternatives Considered

### Alternative 1: Separate LocalStorage key for events

Store events under `BROTEINBUDDY_EVENT_LOG` rather than inside `AppState`.

- **Pros**: Smaller writes when only an event is appended (don't re-serialize all boxes/flavors). Better when the log gets large.
- **Cons**: Two atoms to keep consistent; backup/restore would need to merge two payloads; harder to reason about. With current scale, embedded wins.

Rejected for PR 1. We can extract events to a separate key in a future migration if the embedded log proves too costly.

### Alternative 2: Synthetic backfill on migration

When migrating v2 → v3, emit `box_received` events for every existing box with `timestamp` = migration date.

- **Pros**: Timeline isn't empty on day one.
- **Cons**: Timestamps are wrong (all bunched on migration day). Misleads any future analytics.

Rejected. An honestly empty timeline is better than a fabricated one. The user can interpret "no event = pre-upgrade box" cleanly.

### Alternative 3: Event-sourced state (events as the only source of truth)

Store only events; derive boxes/flavors by replaying.

- **Pros**: Elegant; classic CQRS/ES pattern.
- **Cons**: Massive refactor of every read path. Read performance hits scale O(events) on every page load. Overkill for a hobby PWA with one user.

Rejected. Snapshot + append-only log is the pragmatic middle ground.

### Alternative 4: Defer to PR 2

Capture events only once the server exists.

- **Pros**: One fewer schema migration.
- **Cons**: The user gets no timeline until the multi-week server work lands. Also, PR 2 has nothing concrete to sync.

Rejected. Doing PR 1 first gives the user value immediately and gives PR 2 a stable schema to design against.

## References

- ADR-002: Data Model Design
- ADR-003: LocalStorage Strategy (migration framework)
- ADR-010: Backup/Restore Design
- Plan file: `/Users/nik/.claude/plans/i-would-like-to-staged-reef.md`
