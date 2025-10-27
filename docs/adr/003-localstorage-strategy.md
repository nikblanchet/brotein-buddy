# ADR-003: LocalStorage Strategy

**Status:** Accepted

**Date:** 2025-10-26

**Deciders:** Nik (developer), Claude Code (assistant)

---

## Context

BroteinBuddy requires client-side persistence for protein shake inventory data. Users need their box inventory, flavor preferences, and location mappings to persist across browser sessions without requiring a backend server or authentication.

### Background

The application tracks:

- Physical boxes of protein shakes (quantity, location, open/closed status)
- Flavor definitions (name, random selection preferences)
- User preferences (favorite flavor for quick-pick)
- Application settings

Data size is modest (estimated 5-50 boxes, 5-20 flavors in typical use), totaling well under 100KB even with verbose JSON.

### Problem Statement

We need a persistence solution that:

- Works entirely client-side (no backend required)
- Persists across browser sessions
- Handles data corruption gracefully
- Supports schema evolution (future feature additions)
- Works reliably on iOS Safari (primary target platform as PWA)
- Requires minimal implementation complexity

## Decision

We will use browser localStorage for all application state persistence.

The storage layer will:

- Store the entire AppState as a single JSON object under key `BROTEINBUDDY_APP_STATE`
- Validate all loaded data using existing type guards (`isAppState()`)
- Return default empty state on any load failure (corrupted data, missing data)
- Validate all data before saving to prevent corruption
- Handle quota exceeded errors by throwing exceptions for UI to handle
- Include a migration framework for future schema changes

### Implementation Details

**Storage key:** `BROTEINBUDDY_APP_STATE` (namespaced to avoid conflicts)

**Validation approach:** Use existing type guards from `models.ts` rather than introducing Zod dependency

- Rationale: Type guards are already implemented and tested (100% coverage)
- No external dependencies needed
- Sufficient for localStorage validation (simple boundary check)
- Consistent with existing codebase patterns

**Error handling philosophy:**

- Never crash the application due to storage issues
- Corrupted/invalid data → log warning, return default state
- Quota exceeded → throw exception (caller can notify user)
- Missing localStorage (rare) → gracefully degrade to default state

**Migration strategy:**

- AppState includes `version` field (currently 1)
- `migrateState()` function checks version and transforms data if needed
- For v1, no migrations exist yet (framework placeholder)
- Future versions add migration logic to transform old data to new schema

## Consequences

### Positive

- **Simplicity:** Single storage key, straightforward API, minimal dependencies
- **Reliability:** Well-supported across all browsers (98%+ global support)
- **Performance:** Synchronous API, instant reads/writes for small data
- **Testing:** Easy to mock and test (jsdom provides localStorage in tests)
- **Privacy:** All data stays client-side, no server round-trips
- **Offline-first:** Works perfectly offline (core requirement for PWA)
- **Type safety:** Validation ensures data integrity at boundary

### Negative

- **Storage limits:** localStorage typically limited to 5-10MB (non-issue for our data size)
- **Synchronous API:** Blocks main thread (non-issue for < 100KB data)
- **No structured queries:** Must load entire state (acceptable - state is small)
- **No transactions:** Can't atomically update multiple keys (mitigated by single-key design)
- **String-only storage:** Requires JSON serialization (standard practice, well-supported)

### Neutral

- **Browser-specific:** Data doesn't sync across devices/browsers (expected for local-only app)
- **Quota handling:** Apps must handle quota exceeded errors (implemented)
- **Schema evolution:** Requires migration code (framework in place)

## Alternatives Considered

### Alternative 1: IndexedDB

**Description:** Use IndexedDB for structured storage with indexes and transactions.

**Advantages:**

- Larger storage quota (often 50%+ of disk space)
- Structured queries with indexes
- Asynchronous API (doesn't block main thread)
- Transactions for atomic updates

**Rejected because:**

- Significant complexity overhead for small, simple data
- Asynchronous API adds complexity throughout codebase
- No need for structured queries (we always load full state)
- No need for large storage (data < 100KB)
- localStorage is sufficient and simpler

**Trade-offs:**

- Gained: Simplicity, synchronous API, ease of testing
- Lost: Large storage quota, structured queries (neither needed)

### Alternative 2: Zod for Validation

**Description:** Use Zod library for schema validation instead of type guards.

**Advantages:**

- More powerful validation with detailed error messages
- Can generate TypeScript types from schemas
- Better data transformation/coercion capabilities
- Standard library for runtime validation

**Rejected because:**

- Type guards already implemented and tested (100% coverage in models.ts)
- Adds 14KB dependency for validation that type guards handle adequately
- Would create architectural inconsistency (type guards elsewhere, Zod at storage boundary)
- localStorage is simple boundary - boolean valid/invalid check is sufficient
- No need for data transformation (we save and load JSON as-is)

**Trade-offs:**

- Gained: Consistency with existing codebase, zero dependencies
- Lost: Detailed error messages, advanced validation (not needed for this use case)

**Future consideration:** If we add import/export, API integration, or complex form validation, revisit Zod adoption project-wide.

### Alternative 3: sessionStorage

**Description:** Use sessionStorage instead of localStorage.

**Rejected because:** Data would be lost when browser tab closes, violating core requirement for persistence across sessions.

### Alternative 4: In-memory Only (No Persistence)

**Rejected because:** Persistence is a core requirement. Users expect inventory data to survive browser restarts.

## References

- Related ADRs:
  - ADR-001: Technology Stack Selection (chose Svelte + LocalStorage for simplicity)
  - ADR-002: Data Model Design (defines AppState schema being persisted)
- Implementation:
  - `src/lib/storage.ts` - Storage layer implementation
  - `src/types/models.ts` - Type guards used for validation
  - `tests/unit/storage.test.ts` - 100% coverage test suite
- External documentation:
  - [MDN: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
  - [Web Storage API Browser Support](https://caniuse.com/namevalue-storage)
