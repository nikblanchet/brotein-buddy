# ADR-004: State Management Approach

**Status:** Accepted

**Date:** 2025-10-27

**Deciders:** Nik Blanchet (with Claude Code assistance)

---

## Context

BroteinBuddy requires reactive state management to synchronize application data across UI components and persist changes to LocalStorage. The state includes boxes, flavors, user preferences, and settings, all of which need to update reactively when modified through user interactions.

### Background

This is a Svelte-based Progressive Web App with client-side persistence via LocalStorage. We have:

- **Data models** (ADR-002): TypeScript interfaces for AppState, Box, Flavor, Location
- **Storage layer** (ADR-003): Functions for loading/saving AppState to LocalStorage
- **Business logic**: Box selection, random selection algorithms

The application needs to:

- Provide reactive state that automatically updates UI when data changes
- Persist all state changes to LocalStorage immediately (no explicit save button)
- Support CRUD operations on boxes and flavors
- Handle errors gracefully (storage quota, validation failures)
- Enable multiple components to share the same state
- Maintain type safety throughout the state management layer

### Problem Statement

We need a state management solution that:

1. Integrates seamlessly with Svelte's reactivity system
2. Automatically persists all changes to LocalStorage
3. Provides a clean API for common operations (add/remove/update)
4. Handles validation and error conditions
5. Remains simple and testable
6. Scales to the needs of this application (modest complexity, local-only)

## Decision

We will use **Svelte's built-in writable store** with action functions for mutations.

The implementation will:

- Create a single writable store containing the full AppState
- Initialize the store from LocalStorage on creation
- Auto-save to LocalStorage on every state change via subscription
- Provide action functions for all CRUD operations
- Throw errors for validation failures (caller handles UI notifications)
- Log but not throw on storage errors (state update succeeds, save may fail)

### Store Structure

```typescript
// Single writable store for all app state
export const appState: Writable<AppState>;

// Action functions for mutations
export function loadStateFromStorage(): void;
export function addBox(box: Box): void;
export function removeBox(boxId: string): void;
export function updateBoxQuantity(boxId: string, newQuantity: number): void;
export function updateBoxLocation(boxId: string, location: Location): void;
export function addFlavor(flavor: Flavor): void;
export function updateFlavor(flavorId: string, updates: Partial<Flavor>): void;
export function setFavoriteFlavor(flavorId: string | null): void;
```

### Auto-Save Strategy

Every state change triggers a subscription callback that saves to LocalStorage:

```typescript
const createAppStore = (): Writable<AppState> => {
  const initialState = loadState();
  const { subscribe, set, update } = writable<AppState>(initialState);

  // Auto-save on every change
  subscribe((state) => {
    try {
      saveState(state);
    } catch (error) {
      // Log error but don't crash app
      console.error('Failed to auto-save state:', error);
    }
  });

  return { subscribe, set, update };
};
```

**Rationale for immediate saves:**

- Data size is small (< 100KB), synchronous saves are fast
- Users expect immediate persistence (no save button in UI)
- Simpler than debouncing (no pending state to manage)
- Acceptable performance for this use case

### Error Handling

**Validation errors (throw exceptions):**

- Duplicate IDs when adding box/flavor
- Box/flavor not found when updating/removing
- Invalid values (negative quantity, empty IDs)
- UI catches and displays user-friendly messages

**Storage errors (log but don't throw):**

- Quota exceeded: State change succeeds, save fails, error logged
- Missing localStorage: State held in memory only
- Corrupted data on load: Returns default state

### Implementation Details

**Action pattern:**

- Functions exported alongside store
- Use store's `update()` method to mutate state immutably
- Return void (reactivity via subscriptions)
- Validate inputs before state changes

**Immutability:**

- All mutations create new arrays/objects
- Spread operators for cloning
- No direct mutation of state

**Referential integrity:**

- Actions do NOT validate that flavorId exists when adding boxes
- Actions do NOT validate that favoriteFlavorId exists
- Rationale: Allows flexible setup order (add boxes before flavors if needed)
- Future: Could add strict validation mode if needed

## Consequences

### Positive

**Svelte Integration:**

- Native Svelte stores work perfectly with components
- Automatic reactivity (components re-render on state changes)
- Simple subscription model (`$appState` syntax in components)
- No additional dependencies

**Developer Experience:**

- Clear, predictable API (action functions)
- Type-safe throughout (TypeScript checks all operations)
- Easy to test (mock localStorage, call actions, verify state)
- Straightforward debugging (subscribe to store in devtools)

**Simplicity:**

- Single source of truth (one store for all state)
- No action types, reducers, or middleware
- Minimal boilerplate
- Appropriate for application complexity

**Immediate Persistence:**

- Users never lose data (auto-saved)
- No "unsaved changes" state to manage
- Predictable behavior (change → save)

**Error Handling:**

- Clear separation: validation errors throw, storage errors log
- App remains functional even if saves fail
- Explicit error boundaries in UI code

### Negative

**Performance Considerations:**

- Save on every change (could be inefficient for rapid updates)
- Synchronous localStorage writes block main thread
- Mitigation: Data is small, performance acceptable
- Future: Add debouncing if needed

**No Undo/Redo:**

- Immediate saves make undo/redo complex
- Would need history tracking (not in v1 scope)
- Future: Could implement with state snapshots

**Multi-Tab Issues:**

- Changes in one tab don't update other tabs
- localStorage events exist but not implemented
- Last write wins in multi-tab scenarios
- Acceptable for personal app, document limitation

**Global State:**

- Single store could become large over time
- All state changes trigger all subscribers (no granularity)
- Mitigation: Can add derived stores later for optimization
- Not an issue for current scale

**No Middleware:**

- Can't easily add logging, analytics, or side effects
- Would need to wrap each action function
- Future: Could implement middleware pattern if needed

### Neutral

**No Derived Stores (Yet):**

- Could add computed values (e.g., total quantity by flavor)
- Deferred to Phase 2 when UI needs them
- Easy to add later without breaking changes

**Action Functions vs Methods:**

- Using free functions instead of store methods
- Follows Svelte idiom (import store and actions separately)
- Alternative: Could attach actions to store object
- Current approach is more testable

## Alternatives Considered

### Alternative 1: Multiple Stores

**Description:**

Separate stores for boxes, flavors, and settings:

```typescript
export const boxes = writable<Box[]>([]);
export const flavors = writable<Flavor[]>([]);
export const settings = writable<Settings>({});
```

**Why rejected:**

- Harder to keep stores in sync
- Must save multiple localStorage keys
- Atomic updates across stores are complex
- Loading requires coordinating multiple stores
- AppState is naturally cohesive (boxes reference flavors)

**Trade-offs:**

Benefit: Granular subscriptions (only re-render when specific data changes)
Cost: Coordination complexity, referential integrity harder, multiple save operations

### Alternative 2: Redux/Zustand

**Description:**

Use external state management library like Redux or Zustand.

**Why rejected:**

- Significant complexity overhead for local-only app
- Redux: Requires actions, reducers, middleware setup
- Zustand: Better but still external dependency
- Svelte stores are sufficient and idiomatic
- No need for Redux DevTools (simple app, good tests)

**Trade-offs:**

Benefit: Powerful debugging tools, established patterns, middleware ecosystem
Cost: Learning curve, boilerplate, external dependency, less Svelte-idiomatic

### Alternative 3: Debounced Auto-Save

**Description:**

Debounce saves to localStorage (e.g., 500ms after last change).

```typescript
subscribe(
  debounce((state) => {
    saveState(state);
  }, 500)
);
```

**Why rejected for v1:**

- Adds complexity (pending state, flush on unmount)
- Data size is small, synchronous saves are fast enough
- Immediate saves provide better UX guarantee
- Can add later if performance issues emerge

**Future consideration:** If rapid updates cause performance issues, implement debouncing.

**Trade-offs:**

Benefit: Better performance for rapid updates, less localStorage thrashing
Cost: Complexity, potential data loss if page closes during debounce window

### Alternative 4: Immer for Immutability

**Description:**

Use Immer library to simplify immutable updates:

```typescript
import { produce } from 'immer';

export function updateBoxQuantity(boxId: string, newQuantity: number): void {
  appState.update((state) =>
    produce(state, (draft) => {
      const box = draft.boxes.find((b) => b.id === boxId);
      if (!box) throw new Error(`Box not found: ${boxId}`);
      box.quantity = newQuantity;
    })
  );
}
```

**Why rejected:**

- Adds 14KB dependency
- Spread operators are clear and sufficient for this data structure
- No deeply nested updates (Box and Flavor are shallow)
- TypeScript catches mutation errors already

**Trade-offs:**

Benefit: Simpler update syntax for deeply nested data
Cost: External dependency, magic behavior, unnecessary for shallow data

### Alternative 5: Context API

**Description:**

Use Svelte's context API instead of stores:

```typescript
// Root component
setContext('appState', {
  state: writable(initialState),
  actions: { addBox, removeBox, ... }
});

// Child components
const { state, actions } = getContext('appState');
```

**Why rejected:**

- Context is component-scoped, stores are global
- Stores are easier to test (import directly in tests)
- Context doesn't provide persistence benefits
- Stores are more idiomatic for app-wide state
- Would still need stores under the hood

**Trade-offs:**

Benefit: Explicit dependency injection, avoids global state
Cost: More verbose, harder to test, less idiomatic for global app state

### Alternative 6: Transaction Pattern

**Description:**

Add batch update capability:

```typescript
export function transaction(fn: (state: AppState) => AppState): void {
  appState.update((state) => {
    const newState = fn(state);
    saveState(newState); // Save once after all changes
    return newState;
  });
}
```

**Why rejected for v1:**

- YAGNI (You Aren't Gonna Need It)
- Individual actions are sufficient for current use cases
- Can add later if needed
- Subscription auto-save already batches naturally

**Future consideration:** Add if bulk operations become common.

**Trade-offs:**

Benefit: Optimize multiple updates, single save
Cost: More complex API, easy to misuse, premature optimization

## Implementation Notes

### Testing Strategy

**Unit tests:**

- Mock localStorage (jsdom provides this)
- Call action functions
- Verify state changes using `get(appState)`
- Verify localStorage persistence
- Test error conditions

**Integration tests:**

- Deferred due to @testing-library/svelte v5 compatibility issues
- Will be covered by E2E tests in Phase 2 (Playwright)

**Coverage target:** 100% (state management is critical path)

### Future Enhancements

**Derived stores (Phase 2):**

```typescript
export const totalQuantityByFlavor = derived(appState, ($state) => {
  // Compute total quantity per flavor
});

export const openBoxes = derived(appState, ($state) => $state.boxes.filter((box) => box.isOpen));
```

**Undo/redo (future):**

- Track state history in separate store
- Limit history depth (e.g., last 20 changes)
- UI buttons to undo/redo

**Multi-tab sync (future):**

- Listen to storage events
- Reload state when other tab makes changes
- Handle conflicts (last write wins)

**Optimistic updates (not needed):**

- Local-only app, no network latency
- Synchronous saves are acceptable

## References

- Related ADRs:
  - [ADR-001: Technology Stack Selection](001-technology-stack-selection.md) - Chose Svelte
  - [ADR-002: Data Model Design](002-data-model-design.md) - Defines AppState structure
  - [ADR-003: LocalStorage Strategy](003-localstorage-strategy.md) - Persistence layer
- Implementation:
  - `src/lib/stores.ts` - Store implementation
  - `tests/unit/stores.test.ts` - Comprehensive test suite
- External documentation:
  - [Svelte Stores](https://svelte.dev/docs/svelte-store)
  - [Svelte Tutorial: Stores](https://learn.svelte.dev/tutorial/writable-stores)
  - [Svelte REPL: Store Examples](https://svelte.dev/repl/hello-world)
