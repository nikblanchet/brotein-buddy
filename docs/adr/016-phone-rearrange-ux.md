# ADR-016: Phone-Friendly Rearrange UX

**Status:** Accepted

**Date:** 2026-05-21

**Deciders:** Nik Blanchet

---

## Context

### Background

The Inventory Rearrange screen at `/inventory/rearrange` lets the user move boxes between visual "stacks" (vertical columns) by drag-and-drop, powered by `svelte-dnd-action`. PR #99 (merged 2026-05-21) fixed a CSS scrollport bug: `.rearrange-container` wasn't a scrollport, so stacks below the fold were unreachable on a small viewport. With the fix, the user can now scroll to those stacks, and the dnd library's edge auto-scroll engages during touch drag.

The fix made phone rearrange _possible_ but did not make it _good_. Long-press-and-drag with edge-auto-scroll on a 4-inch touchscreen is notoriously hard to control: the user must hold the box steady, drift toward the screen edge to trigger auto-scroll, watch the layout reflow underneath, and release at the right moment over the right target — all while their finger occludes the drop zone. PR #99's first-pass code review explicitly flagged this as an out-of-scope follow-up (finding #13) and recommended an ADR.

### Problem Statement

- Cross-stack drag on phone is awkward when the target stack is off-screen. The user starts a drag, the container begins auto-scrolling, but precise control over scroll speed and final drop position is hard.
- Intra-stack reorder on phone is fine — the gesture is short, no edge-scroll involved.
- The keyboard path (Space to lift, Tab to focus the target stack, which `svelte-dnd-action` interprets as a drop) works on a laptop with an external keyboard. It is not available on phone.
- Desktop drag works as designed. The problem is specific to touchscreen + cross-stack with overflow.

The interaction model needs a phone-appropriate affordance for the specifically hard case, without regressing the cases that already work.

## Decision

Add a per-box **Move...** button on the Inventory Rearrange screen. Tapping it enters a "move mode" in which **insertion-point markers** render between every pair of boxes in every stack (including the top and bottom of each stack). Tapping a marker moves the box to that position. Drag-and-drop remains unchanged for every device, every direction, and every distance.

The Move button is the additive entry point for the awkward case (cross-stack with overflow on phone). Drag continues to handle desktop, intra-stack reorder, and short cross-stack moves where the user finds it ergonomic.

### Implementation Details

**State.** A single `$state` rune in `InventoryRearrange.svelte` tracks move mode:

```ts
let movingBoxId = $state<string | null>(null);
```

When `movingBoxId === null`, the screen behaves exactly as it does today. When non-null, the screen is in move mode for that box.

**Per-box Move button.** Each box card renders a small icon button in its corner (move-arrow glyph from the icon set). Aria-label: `"Move {flavor name} box"`. Tapping the button sets `movingBoxId = box.id`.

**Insertion-point markers.** While `movingBoxId !== null`, each stack renders thin horizontal bars between every pair of boxes plus one at the top and one at the bottom. Each marker is a focusable `<button>` with `role="button"` and an aria-label of the form `"Insert at top of stack 3"`, `"Insert between Vanilla and Chocolate in stack 3"`, etc. Visually, markers reuse the 2px accent-bar pattern from `AppNav.svelte`'s active-tab indicator (see ADR-015) so the move affordance reads as part of the established system.

**Source treatment.** The box identified by `movingBoxId` gets an outlined "this is moving" treatment (token-system `--color-accent` outline plus a slight scale). Other boxes dim very slightly to focus attention on the markers.

**Sticky banner.** A sticky banner appears at the top of the scrollport in move mode: `"Moving {flavor name} — tap a position, or cancel"` with an explicit `Cancel` button. This makes the mode discoverable and gives a deterministic exit. Tapping the source box's Move button again also exits move mode.

**Drag suspension.** While in move mode, the `dndzone` `dragDisabled` config flag is set on every stack. This avoids tap/drag conflict (a user holding the Move button briefly should not accidentally start a drag) and reserves the screen for the marker interaction.

**Commit.** Tapping a marker calls the existing `simulateMove(boxes, boxId, { stack, height })` from `src/lib/rearrange-utils.ts`, then `validateRearrangementState(boxes)`. These paths are unchanged from drag drop today, so validation surface (per-box red borders, global error banner) and undo behavior are preserved.

**Keyboard parity.** The Move button is focusable; Enter activates it. Markers are focusable; arrow keys cycle through them top-to-bottom within a stack and left-to-right across stacks (matching the visual reading order produced by the auto-fit grid); Enter commits. Escape exits move mode. The pre-existing `svelte-dnd-action` keyboard path (Space to lift, Tab to focus the target stack) is untouched and remains a parallel route.

**E2E coverage.** A new test in `tests/e2e/rearrange.spec.ts` at iPhone-SE viewport exercises the button + marker path end-to-end. The existing keyboard cross-stack-rearrange test (the deterministic regression guard for dnd) is unchanged.

## Consequences

### Positive

- Cross-stack-with-overflow on phone has a precise affordance. Markers preserve drag's full expressiveness — pick any insertion position, not just "land at the bottom of stack N."
- One UI ships to every device. No viewport-conditional branching, no second interaction model to maintain.
- State utilities in `src/lib/rearrange-utils.ts` (`simulateMove`, `reorderBoxesAfterMove`, `getAffectedBoxes`, `validateRearrangementState`) plus `validateLocationNoGaps` from `src/lib/utils/location-validation.ts` are reused as-is. No new business logic.
- Keyboard a11y is preserved through two parallel paths: the existing dnd keyboard path and the new Move-button + marker path. Both land in the same state-update functions.
- Drag is not removed. Existing muscle memory is intact; outside move mode the screen behaves exactly as it does today. The change is purely additive.

### Negative

- Per-box chrome on the rearrange screen: a small icon button on each box card. Only this screen carries the visual cost; the normal inventory view is unchanged.
- Move mode is a hidden state. The sticky banner with an explicit Cancel mitigates discoverability cost, but a user who taps the Move button by accident must read the banner to understand what happened.
- Insertion markers need design polish. Density risks feel cluttered if proportions are wrong, especially on a dense iPhone-SE layout: a stack of N boxes renders N+1 markers, so 8 stacks of 3 boxes show 32 markers simultaneously during move mode.

### Neutral

- Drag remains the primary affordance on desktop. The new button is mostly cosmetic there — laptop users will rarely tap it, and the icon is small enough to read as a secondary action.
- The `delayTouchStart: 150` config on `svelte-dnd-action` stays in place; the Move button's tap target is separate and small, so the tap-vs-drag disambiguation is preserved.

## Alternatives Considered

### Alternative 1: Status quo (drag-only)

Ship the PR #99 CSS fix and stop. Rejected — the fix makes phone rearrange possible, not pleasant. Long cross-stack moves remain awkward enough that the PR reviewer explicitly called for a follow-up. Doing nothing locks in a known UX gap.

### Alternative 2: Tap-source then tap-destination on phone, drag on laptop

Viewport-conditional UX via container query at 820px. Tap a box to select; tap a target stack to move it there. Rejected on two grounds. First, maintaining two interaction models doubles the test surface and creates a "different device, different UX" learning cost the user doesn't want. Second, "selection mode" is a hidden state on a 4-inch screen without hover — every tap on the rearrange screen would have dual meaning depending on whether something is selected, a known UX trap. The per-box Move button surfaces the entry point explicitly (one button, one purpose) and the sticky banner makes the resulting mode visible.

### Alternative 3: Single-column list view on phone, grid elsewhere

Reframe phone as a vertical scrollable list grouped by stack. Rejected — the 2D spatial layout _is_ the value of the Inventory Rearrange screen. Users open this screen specifically to see and reshape stack adjacencies. A list view collapses the spatial mental model that distinguishes "rearrange" from "edit a box." The follow-on cost (a second screen for what is conceptually one feature) is also high.

### Alternative 4: Stack picker sheet on every move

Tap a box, sheet opens listing all stacks, tap a target. Rejected — three taps for the most-common case, and lossy: a sheet picks a stack but not an insertion position. Insertion markers cover the same selection surface in one tap while preserving position precision.

### Alternative 5: Tap-everywhere (kill drag entirely)

Replace drag with tap-source/tap-destination on every device, single code path. Rejected — eliminates the working laptop interaction and the working intra-stack drag on phone. The cost (loss of continuous drag feedback that desktop users rely on) is much higher than the benefit of unifying the code path. A small button is easier to add than a primary interaction is to remove.

## Next Steps

The implementation lands in a separate PR. Scope:

- `src/routes/InventoryRearrange.svelte`: add `movingBoxId` state, per-box Move button, insertion markers, sticky banner, drag-suspension during move mode.
- `tests/e2e/rearrange.spec.ts`: add iPhone-SE viewport test for the button + marker path.
- No changes to `src/lib/rearrange-utils.ts` — affordance-agnostic by design.
- A linked teaching doc may follow in `docs/teaching/` if the marker pattern is reused elsewhere; not required for this ADR.

## References

- ADR-014: OKLCH Cloud Dancer Token System — provides the colors for the Move button, the source-box outline, and the insertion-point markers.
- ADR-015: Persistent Three-Tab Navigation — establishes the iOS-style accent-bar visual pattern reused by insertion markers; also the container-query responsive strategy.
- [`docs/teaching/2.7-drag-drop-interfaces.md`](../teaching/2.7-drag-drop-interfaces.md) — original drag-and-drop design and `svelte-dnd-action` integration.
- [`docs/teaching/2.9-scrollport-pattern-and-touch-drag-tradeoffs.md`](../teaching/2.9-scrollport-pattern-and-touch-drag-tradeoffs.md) — PR #99 teaching doc; touch UX trade-offs that motivated this ADR.
- PR #99 first-pass code review finding #13 — the source flag noting the rearrange UX gap on phone.
