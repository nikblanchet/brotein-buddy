# ADR-002: Data Model Design

**Status:** Accepted

**Date:** 2025-10-26

**Deciders:** Nik Blanchet (with Claude Code assistance)

---

## Context

BroteinBuddy needs a data model to represent protein shake inventory, including flavors, physical boxes, storage locations, and application state. The model must support the core features: weighted random selection, box priority sorting, inventory management, and location tracking.

### Background

This is a client-side only Progressive Web App (PWA) with no backend. All data will be persisted to LocalStorage as JSON. The app needs to:

- Track multiple boxes of the same flavor
- Support physical location tracking (stacks of boxes)
- Enable weighted random selection based on total quantity
- Prioritize open boxes over unopened ones
- Allow users to exclude flavors from random selection
- Configure a favorite flavor for quick access

### Problem Statement

We need to design TypeScript interfaces that:

1. Accurately model the domain (flavors, boxes, locations)
2. Support all planned features without over-engineering
3. Can be easily serialized to/from JSON for LocalStorage
4. Allow for future schema evolution without breaking existing data
5. Provide type safety and compile-time checks
6. Enable efficient lookups and queries in the UI

## Decision

We will use a **normalized, ID-based data structure** with the following core interfaces:

### Location (stack, height)

```typescript
interface Location {
  stack: number; // Horizontal position (0-indexed column)
  height: number; // Vertical position (0 = ground, 1 = one box up, etc.)
}
```

Locations use a simple 2D coordinate system. Stack represents which column, and height represents how many boxes up from the ground.

### Flavor (id, name, excludeFromRandom)

```typescript
interface Flavor {
  id: string;
  name: string;
  excludeFromRandom: boolean;
}
```

Flavors are the primary categorization. They are referenced by ID from boxes.

### Box (id, flavorId, quantity, location, isOpen)

```typescript
interface Box {
  id: string;
  flavorId: string; // Reference to Flavor.id
  quantity: number; // Number of bottles (>= 0)
  location: Location;
  isOpen: boolean;
}
```

Boxes represent physical containers. They reference flavors by ID rather than embedding flavor data.

### AppState (boxes, flavors, favoriteFlavorId, settings)

```typescript
interface AppState {
  boxes: Box[];
  flavors: Flavor[];
  favoriteFlavorId: string | null;
  settings: Settings;
}
```

AppState is the root object that gets persisted to LocalStorage.

### Implementation Details

**ID Strategy:**

- Use string IDs for flexibility (can be UUIDs, timestamps, or sequential)
- Implementation can choose the generation strategy without changing interfaces
- IDs must be unique within their entity type

**Type Guards:**

- Implement runtime type guards (`isLocation`, `isFlavor`, `isBox`, `isAppState`)
- Essential for validating data loaded from LocalStorage
- Helps catch corrupted data early

**Validation:**

- Enforce constraints at type guard level: non-negative integers, non-empty strings
- Quantity must be >= 0 and an integer
- Stack and height must be >= 0 and integers

**Normalization:**

- Boxes reference flavors by ID (not embedded)
- Allows changing flavor names without updating all boxes
- Reduces duplication in serialized JSON

## Consequences

### Positive

**Type Safety:**

- TypeScript catches errors at compile time
- IDE autocomplete and inline documentation via JSDoc
- Refactoring is safer with type checking

**Simple Serialization:**

- All types serialize cleanly to JSON
- No special handling needed for LocalStorage
- No circular references

**Normalized Structure:**

- Changing a flavor name updates once, applies everywhere
- Easier to maintain referential integrity
- Smaller JSON payload (no duplication)

**Extensibility:**

- Can add new fields to interfaces without breaking existing code
- Settings object is placeholder for future configuration
- Location system can be extended (e.g., add 'room' field later)

**Validation:**

- Type guards enable runtime validation
- Can detect and handle corrupted LocalStorage data gracefully
- Clear error messages when validation fails

### Negative

**Referential Integrity:**

- No database-level foreign key constraints
- App code must ensure flavorId references valid Flavor.id
- Orphaned boxes possible if flavor deleted without cleanup

**Migration Complexity:**

- No built-in schema versioning yet
- Future schema changes require migration logic
- Must handle loading old data formats

**Lookup Performance:**

- Finding a flavor by ID requires array search (O(n))
- Could be optimized with Maps in runtime, but complicates serialization
- Acceptable for small datasets (unlikely to have 1000s of flavors)

**Memory Duplication:**

- In-memory state duplicates LocalStorage data
- Not an issue for this app size
- Could matter if inventory grows very large

### Neutral

**No Timestamps:**

- Not tracking creation/modification times in v1
- Could add later if needed (extend interfaces)
- Simplifies model for now

**Minimal Settings:**

- Settings object is placeholder (empty in v1)
- Reserves space for future features
- Doesn't add complexity yet

**Location Simplicity:**

- 2D grid system (stack, height) sufficient for v1
- Doesn't handle multiple physical locations (e.g., different rooms)
- Could extend Location interface later if needed

## Alternatives Considered

### Alternative 1: Embedded Flavors

**Description:**

Embed full Flavor object inside each Box instead of using flavorId reference.

```typescript
interface Box {
  id: string;
  flavor: Flavor; // Embedded, not referenced
  quantity: number;
  location: Location;
  isOpen: boolean;
}
```

**Why rejected:**

- Duplicates flavor data for every box
- Changing flavor name requires updating all boxes
- Larger JSON payload in LocalStorage
- More complex updates

**Trade-offs:**

Benefit: Simpler lookups (no need to find flavor by ID)
Cost: Data duplication, harder updates, larger storage

### Alternative 2: Relational IDs with Maps

**Description:**

Use Maps for faster lookups instead of arrays.

```typescript
interface AppState {
  boxes: Map<string, Box>;
  flavors: Map<string, Flavor>;
  favoriteFlavorId: string | null;
  settings: Settings;
}
```

**Why rejected:**

- Maps don't serialize to JSON directly
- Would need custom serialization/deserialization
- Adds complexity for minimal benefit (small dataset)
- Array operations (filter, map) are idiomatic and clear

**Trade-offs:**

Benefit: O(1) lookups by ID
Cost: Complex serialization, non-standard JSON structure

### Alternative 3: Single Inventory Array

**Description:**

Combine flavors and boxes into a single inventory array with type discriminators.

```typescript
type InventoryItem =
  | { type: 'flavor'; id: string; name: string; excludeFromRandom: boolean }
  | {
      type: 'box';
      id: string;
      flavorId: string;
      quantity: number;
      location: Location;
      isOpen: boolean;
    };

interface AppState {
  inventory: InventoryItem[];
  favoriteFlavorId: string | null;
  settings: Settings;
}
```

**Why rejected:**

- Mixes domain concepts (flavors and boxes are different things)
- Type guards more complex with discriminated unions
- Filtering to get all flavors or all boxes is common operation
- Less clear domain model

**Trade-offs:**

Benefit: Single array to iterate
Cost: Conceptual confusion, harder to work with, mixed concerns

### Alternative 4: Class-Based Models

**Description:**

Use TypeScript classes with methods instead of plain interfaces.

```typescript
class Box {
  constructor(
    public id: string,
    public flavorId: string,
    public quantity: number,
    public location: Location,
    public isOpen: boolean
  ) {}

  isEmpty(): boolean {
    return this.quantity === 0;
  }

  // ... more methods
}
```

**Why rejected:**

- Classes don't serialize/deserialize cleanly to JSON
- Would need custom reviver functions
- Methods add complexity when simple data structures suffice
- Svelte stores work best with plain objects
- Can always add utility functions separately if needed

**Trade-offs:**

Benefit: Encapsulation, methods on data
Cost: Serialization complexity, harder to persist, less idiomatic for reactive frameworks

### Alternative 5: 3D Location System

**Description:**

Use 3D coordinates (x, y, z) or (room, stack, height) for more complex location tracking.

```typescript
interface Location {
  room: string; // 'garage', 'pantry', etc.
  stack: number;
  height: number;
}
```

**Why rejected:**

- YAGNI (You Aren't Gonna Need It) - user only has one storage location
- Adds complexity without clear benefit for v1
- Can extend Location interface later if needed
- Simple 2D grid sufficient for initial use case

**Trade-offs:**

Benefit: Handles multiple physical locations
Cost: Unnecessary complexity for v1, confusing UX if only one location used

## References

- [ADR-001: Technology Stack Selection](001-technology-stack-selection.md) - Explains why LocalStorage
- [Svelte stores documentation](https://svelte.dev/docs/svelte-store) - How reactive state works with plain objects
- [TypeScript Handbook: Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates) - Type guard pattern used here
- Martin Fowler's "Patterns of Enterprise Application Architecture" - Inspiration for normalized data structures
