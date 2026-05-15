# ADR-013: Persistent Three-Tab Navigation with Pick as Default Route

**Status:** Accepted

**Date:** 2026-05-14

**Deciders:** Nik Blanchet

---

## Context

### Background

The pre-2026 navigation pattern was a button-grid Home screen at `/`. The four primary actions (random caffeinated, random decaf, favorite quick-pick, manage inventory) lived as large vertical buttons; deeper screens (`/random`, `/random/confirm`, `/inventory`, `/inventory/:id/edit`, `/inventory/rearrange`) had no persistent navigation - the user navigated back via a per-screen "Back" button, and there was no top-level "you are here" affordance once they left the Home grid.

The 2026 UX refresh introduces a Pick screen with two big pool buttons, replacing the four-button grid. The user has reported spending roughly 85% of their time on the pick flow, so the design centers Pick as the default landing screen and gives every screen a persistent way back to it.

### Problem Statement

- The button-grid Home wastes screen real estate when 85% of taps are on two of the four buttons. The other two (favorite, manual choose) are accessory actions that can collapse into the Pick screen as secondary chrome.
- Without persistent navigation, deep flows (Box Edit, Rearrange) trap the user behind a back button stack. There's no "I want to go pick a flavor right now" escape hatch from inside Box Edit.
- The same component layout needs to work on a phone (390x844) and a laptop (1280x800), but the affordances differ: a bottom tab bar is the iOS-native phone pattern, a left rail is the laptop / desktop pattern.

## Decision

We will replace the Home button-grid with three persistent top-level destinations - Pick, Inventory, More - rendered as a bottom tab bar on phone widths and a left rail on laptop widths. Pick becomes the default route at `/`. The persistent nav stays mounted across every screen, including deep flows like Box Edit, so the user always has a one-tap escape.

### Implementation Details

**App shell.** `App.svelte` wraps the router outlet in a CSS grid (`.app-shell`) with named areas for `topbar`, `main`, and `nav`. The grid template flips at 820px container width via `@container app (min-width: 820px)`:

```css
/* Phone: stacked, nav at bottom */
grid-template-areas: 'topbar' 'main' 'nav';
grid-template-rows: auto 1fr auto;
grid-template-columns: 1fr;

/* Laptop: rail on the left, content on the right */
grid-template-areas: 'nav topbar' 'nav main';
grid-template-rows: auto 1fr;
grid-template-columns: 72px 1fr;
```

The `topbar` row is `auto`, so when nothing is rendered into it the row collapses to 0px - screens that don't need a topbar (Pick, Box Edit, More) don't pay for a phantom space. Only the laptop Inventory list renders a topbar, with the `+ Add inventory` CTA.

**AppNav component.** A single `AppNav.svelte` renders all three breakpoints' versions. Active state is derived from `import { location } from 'svelte-spa-router'` via `$derived`, so back/forward buttons keep the highlight in sync without a separate store. The active indicator is an iOS-style top-edge bar on phone (28x2px) and a left-edge bar on laptop (3x28px).

**Container queries, not media queries.** Every responsive switch goes through `@container app` against `.app { container-type: inline-size; container-name: app; }`. The structural switches that CSS alone can't make (FAB vs topbar Add button, sheet vs side panel) read an `isWide` $state in `App.svelte` driven by a `ResizeObserver` on the `.app` element. The observer sets `isWide` synchronously from `offsetWidth` on mount so the very first paint already knows which form to render - no first-paint flash.

**Routes.** Pick is the default at `/`; Random and RandomConfirm are deleted (their flow folds into Pick + a result-sheet overlay). More is a new `/more` route with three list rows: Backup & restore, Rearrange stacks, Settings (placeholder).

**Deep-flow stage header.** Box Edit replaces its own pseudo-topbar with a stage header pattern: a back chevron leading "Inventory" and a stage title "Edit box". The persistent tab bar / rail stays visible underneath as the escape hatch.

## Consequences

### Positive

- The 85% pick path is now one tap from any screen, not three taps from a deep flow.
- Active state is URL-derived, so the user's mental model (browser back button works, tab highlight stays in sync) holds without coordinating local component state.
- Same component, same content, two layouts. The phone and laptop variants share every line of HTML and most of the CSS - only one `@container` block per element flips the layout.
- Container queries make the app embeddable. A future iPad split-screen or any fixed-size shell will respond to its actual rendered width, not the viewport.

### Negative

- The bottom tab bar permanently reserves ~58px on phone. On a 390x844 viewport that's ~7% of the visible area always occupied, even on Pick where the user might want all the screen for the pool buttons. Acceptable trade-off for the one-tap-to-Pick guarantee.
- The Home route disappears. Any external bookmark or hash link to `/` lands on Pick now, which matches user intent but breaks the muscle memory of users who taped through the Home button grid.
- Adding a fourth top-level destination is a real design problem: three is the comfortable phone tab-bar limit. Future screens (e.g. an Insights or Trends tab if/when the local event timeline grows) will have to either replace one of the three or move to More.

### Neutral

- The favorite quick-pick and manual pick both move from dedicated Home buttons into Pick screen secondary chrome (the favorite pill and the "Or choose a specific flavor" link). Same operations, different container.
- The `selectedFlavorId / selectedPool / selectedMethod` cross-route stores in the now-deleted `navigation-state.ts` are gone. Pick replaces them with a single `pickResult` writable in `pick-state.ts` that the result sheet reads directly.

## Alternatives Considered

### Alternative 1: Keep the Home grid, add a tab bar above it

A hybrid where the Home button grid stays at `/` but a tab bar sits above it. Rejected because the Home grid was redundant with the tab bar's destinations (every Home button maps to a tab or to a Pick action) and the result is two competing primary affordances on the same screen.

### Alternative 2: Hamburger menu for laptop, tab bar for phone

A common pattern: laptop hides the nav behind a hamburger, phone keeps the tab bar. Rejected because the laptop screen has plenty of real estate for a 72px rail and hiding navigation behind a tap is just friction. The same component should respond to its width, not switch interaction models.

### Alternative 3: Media queries for the breakpoint instead of container queries

Simpler tooling story (`@media (min-width: 820px)` is universally supported). Rejected because the design prototype is rendered inside a fixed-size frame, the future iPad use case wants the same behavior, and we already needed JS-side breakpoint detection (`isWide`) for the FAB↔topbar swap - so making CSS portable too costs nothing extra.

## References

- ADR-006: Routing strategy (still in force; the new routes follow the same hash-routing model)
- ADR-012: OKLCH Cloud Dancer Token System (provides the design tokens this nav consumes)
- Design handoff: [`docs/design/2026-ux-refresh/README.md`](../design/2026-ux-refresh/README.md), sections "Navigation" and "Responsive Strategy" (annotated screenshots in the sibling `screenshots/` directory)
