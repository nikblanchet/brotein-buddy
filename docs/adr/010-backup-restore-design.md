# ADR-010: Backup & Restore Feature Design

**Status:** Accepted

**Date:** 2026-05-14

**Deciders:** Nik (developer), Claude Code (assistant)

---

## Context

BroteinBuddy stores all user data in browser `localStorage` (see ADR-003). That
choice keeps the app simple, server-free, and offline-friendly, but it has one
sharp edge: the data lives in exactly one place, on exactly one device. If the
browser is cleared, the site data is purged by an OS storage sweep, or the user
switches devices, the inventory is gone. There is also no built-in path for the
user to move their inventory between devices — say, from an iPad to a phone.

After the 3.5 production launch we wanted a low-effort safety net before
investing in anything heavier (cloud sync, accounts, IndexedDB). A JSON
download/upload flow is the smallest possible answer: the user owns the file,
the app stays single-device, and we keep the existing storage architecture
intact.

### Background

The existing storage layer (`src/lib/storage.ts`) already had three properties
we wanted to lean on:

1. A versioned schema (`AppState.version`, currently `2`).
2. A `migrateState()` function that upgrades older payloads on load.
3. An `isAppState()` type guard used as a validation boundary.

The Svelte store layer (`src/lib/stores.ts`) auto-persists every change to
`localStorage` via a subscription. So any code that _replaces the in-memory
state_ automatically gets persistence "for free."

### Problem Statement

We need to let users:

- Export their entire app state to a portable file they can keep, sync via
  AirDrop / iCloud / email, or hand to a future device.
- Import a previously-exported file, even if it was created against an older
  schema version, without corrupting their current data on an accident.

Constraints:

- Single-user, single-device app — no accounts, no server, no cloud.
- iOS Safari is the primary target (PWA), so we cannot rely on the File System
  Access API or other Chromium-only conveniences.
- We do not want to grow the surface area of the data layer significantly —
  the storage module is already at 100% coverage and we like it that way.

## Decision

We will ship an in-app **Backup & Restore** modal, opened from a `Backup`
button in the Inventory page header. It supports two operations:

1. **Download backup** — serializes the current `AppState` to a
   pretty-printed JSON string (2-space indent), wraps it in a `Blob`, and
   triggers a browser download via a transient `<a download>` element. The
   filename is `brotein-buddy-backup-YYYY-MM-DD.json` using the local date.

2. **Restore from backup** — reads a user-selected JSON file with
   `File.text()`, pipes it through the same `migrateState` → `isAppState`
   pipeline used by `loadState`, shows a preview, and only swaps the live
   store on an explicit second click.

### Implementation Details

**Module split.** Pure logic lives in `src/lib/backup.ts` (no DOM, no
storage). DOM concerns (Blob, `<a>`, file input, modal state) live in
`src/lib/components/BackupRestoreModal.svelte`. This is the same separation
of concerns we use for storage vs stores vs components.

**Typed errors.** `parseBackupJson()` throws a `BackupError` carrying a
discriminated `reason: 'empty' | 'malformed-json' | 'schema-invalid'`. The
component switches on `reason` to pick the inline message, never on
`err.message` and never via `instanceof` of a third-party error type.

**`migrateState` becomes public.** Previously this function was effectively
private to `lib/storage.ts`. To restore a v1 file into a v2 app we need the
same upgrade path. Rather than duplicate the logic in `backup.ts`, we
exported `migrateState` from `storage.ts` and documented (in the module
docstring) that this exposure is deliberate, not an accident.

**Replace-state action.** A new `replaceAppState(state)` in `lib/stores.ts`
re-validates with `isAppState()` (defense in depth — we already validated in
`parseBackupJson`) and then `appState.set(state)`. We rely on the existing
auto-save subscription to persist; we do not call `saveState()` directly. The
restore path therefore stays in the same lane as every other state mutation.

**Two-step destructive confirmation.** Picking a file does not overwrite
data. The component holds a small state machine in `importStage` with three
values: `'idle' | 'preview' | 'error'`. On a successful parse we transition
to `preview` and show a count of flavors, boxes, and whether a favorite is
set. Only the user clicking "Replace data" calls `replaceAppState`. An
`$effect(() => { if (!open) resetImport(); })` ensures closing the modal
mid-flow cleans up.

**Accessibility.** The file `<input type="file">` is visually hidden (CSS
clip rect) but reachable; it carries `aria-label="Choose backup file
(.json)"`. The labeled `Button` that triggers it carries `ariaLabel="Choose
backup file to restore"`. Screen readers announce a sensible name on both;
sighted users see only the styled button.

**Filename construction.** Local date, not UTC. The user thinks in their own
timezone, and the only consumer of the filename is the user. `padStart(2,
'0')` keeps lexical ordering working for the day they download multiple
backups in one week.

## Consequences

### Positive

- **User-owned data portability.** No accounts, no servers — users keep
  their data on their own devices and storage.
- **Trivial migration testing.** Restoring a v1 backup into a v2 app exercises
  the same `migrateState` code path that loading legacy `localStorage`
  payloads exercises. Coverage of that path stays free.
- **Defense in depth.** Validation happens twice (parse-time and
  replace-time). A corrupted file cannot leak into the store even if a future
  caller bypasses the parse step.
- **Auditable JSON.** Pretty-printed output means users (and us, during
  bug reports) can open a backup in a text editor and read it.
- **Composable building blocks.** `exportStateAsJson` / `parseBackupJson` /
  `buildBackupFilename` are pure functions. Future flows (e.g., shareable
  links, cloud sync, integration tests that need a known state) can reuse
  them without touching the DOM.

### Negative

- **`migrateState` is now public API.** Anyone editing it has to consider
  not only the localStorage payload but also user-provided files. The
  storage-module docstring calls this out, but it is an additional
  maintenance constraint.
- **Synchronous file read in memory.** `File.text()` reads the whole file
  into a string. For the data sizes we expect (single-digit KB) this is
  fine, but a malicious or accidental multi-megabyte file would do
  unnecessary work before failing schema validation. We accept this — the
  failure mode is a brief UI hang, not data loss.
- **No undo.** "Replace data" is destructive and final. We mitigate via the
  two-step confirmation and the in-modal warning ("Consider downloading a
  backup first"), but we do not snapshot the prior state. Adding undo is
  cheap (snapshot before `appState.set`); we did not ship it because it
  felt like scope creep for v1 of this feature.
- **No partial / merge import.** Restore is all-or-nothing replacement.
  Selectively importing flavors or boxes is a meaningfully different feature
  (conflict resolution, ID collisions, UI for picking pieces) and out of
  scope.

### Neutral

- **No dedicated `/settings` route.** We mounted the Backup button in the
  Inventory header rather than creating a new top-level screen. See
  Alternative 3 for why, and the "Going Deeper" section of the companion
  teaching doc for when to revisit.
- **One file format, one operation per file.** Backups are always full
  state, never partial, never diff. The file is the schema.

## Alternatives Considered

### Alternative 1: Duplicate the migration logic in `backup.ts`

**Description:** Keep `migrateState` private to `storage.ts` and copy the
v1-to-v2 transform into `backup.ts` (or generalize both via a shared
`migrations` module).

**Rejected because:** The transformations are not "almost the same" — they
are _exactly the same_. Two copies of identical code is the highest-risk
duplication possible: a future migration bug would have to be fixed twice
and tested twice, and any drift between the copies would be a silent
correctness bug at the storage/import boundary. Exposing one function from
`storage.ts` is a smaller cost than that.

**Trade-offs:** Gained: single source of truth. Lost: `migrateState` is no
longer file-private (mitigated by an explicit docstring).

### Alternative 2: Restore without two-step confirmation

**Description:** Pick a file → instantly replace. (Maybe with a `confirm()`
dialog.)

**Rejected because:** The action is destructive and irreversible. A single
errant tap on a mobile device should not be able to wipe a user's inventory.
The preview also serves a second purpose — it lets the user verify they
picked the right file before committing, by showing the filename and a
high-level count of what is inside.

**Trade-offs:** Two clicks instead of one. Worth it.

### Alternative 3: Dedicated `/settings` route

**Description:** Create a new top-level route with a Backup section, plus
future sections for theme, defaults, "danger zone," etc.

**Rejected because:** We have exactly one settings-shaped feature today.
Creating a route, a nav entry, a page component, and tests for a screen with
one button on it is premature. Mounting the Backup button on Inventory
keeps the surface area small and is easy to undo — when we ship a second
settings-shaped feature, lifting both into a `/settings` page is a routine
refactor.

**Trade-offs:** Inventory header has one more button. The button is in a
slightly odd spot ("Backup" is not really about inventory) but it is also
the place users spend the most time, so discoverability is high.

### Alternative 4: IndexedDB export instead of JSON file

**Description:** Use the same IndexedDB / Origin Private File System APIs
to copy data between origins or store backups in a sandbox.

**Rejected because:** Defeats the purpose. The user cannot move that data
to another device, email it to themselves, or save it to iCloud. A
downloadable file is the _least_ magic, _most_ portable artifact we can
produce.

### Alternative 5: Cloud sync (Supabase, Firebase, etc.)

**Description:** Stand up a backend, add accounts, sync state across devices.

**Rejected because:** This is a different product. BroteinBuddy is single-
user single-device by design (ADR-001). If we ever want sync, a server-side
service is the right answer, but it is not a backup feature — it is a
re-architecture.

## References

- Related ADRs:
  - ADR-001: Technology Stack Selection (single-device, no backend)
  - ADR-003: LocalStorage Strategy (defines the migration framework reused
    here)
  - ADR-004: State Management Approach (auto-save subscription that
    persistence-for-free relies on)
- Implementation:
  - `src/lib/backup.ts` — pure functions (export, parse, filename)
  - `src/lib/components/BackupRestoreModal.svelte` — UI and state machine
  - `src/lib/storage.ts` — `migrateState` now exported
  - `src/lib/stores.ts` — `replaceAppState` action
  - `src/routes/Inventory.svelte` — button + modal mount
- Tests:
  - `tests/unit/backup.test.ts` (14 tests)
  - `tests/unit/stores.test.ts` (2 added tests for `replaceAppState`)
  - `tests/e2e/backup-restore.spec.ts` (5 tests across Desktop Chrome and
    Mobile Safari)
- Teaching doc:
  - `docs/teaching/3.6-json-file-backup-pattern.md`
- PR: #93
