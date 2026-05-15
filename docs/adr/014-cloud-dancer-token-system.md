# ADR-014: OKLCH Cloud Dancer Token System with Curated Flavor Palette

**Status:** Accepted

**Date:** 2026-05-14

**Deciders:** Nik Blanchet

---

## Context

### Background

The pre-2026 design system used hex/rgba colors and a `getFlavorColor(id)` helper that hashed flavor IDs to HSL values with fixed saturation (65%) and lightness (55%). Surface and ink tokens lived in `src/styles/variables.css` under `--color-*` names. Box cards on the Inventory screen took the hash output as their full background, producing a saturated rainbow of tints.

A high-fidelity design handoff for the 2026 UX refresh prescribed a complete token replacement: warm low-chroma surfaces themed on the Pantone 2026 Color of the Year (Cloud Dancer), a single restrained bronze accent, and a curated 12-tone flavor palette designed to read as muted "stained paper" against the cream surface rather than as candy-bright tints.

### Problem Statement

- The hash-to-HSL flavor palette produced unpredictable contrast: some hues landed dark and busy, others washed-out and indistinguishable on the page background. The two-flavor "looks the same" failure case was easy to hit.
- Hex/rgba color manipulation was painful when we needed tone variants (a fill, an accent, an ink) for the same hue family. OKLCH expresses lightness, chroma, and hue as separable axes, which makes "same hue, different lightness" a one-number change rather than a color-space conversion.
- The redesign needed responsive layout switches (rail vs tab bar, sheet vs side panel) at one container-aware breakpoint, but the pre-existing `:root` block had no responsive primitives at all.
- A future dark mode wants a clean lightness flip, which is mechanical in OKLCH and ad-hoc in hex.

## Decision

We will replace the entire `--color-*` / `--shadow-*` / `--radius-*` token surface with the OKLCH Cloud Dancer system from the design handoff. The flavor color helper is rewritten as `getFlavorTone(id) → { fill, accent, ink }` backed by a hand-curated 12-entry `PALETTE` constant.

### Implementation Details

**Surfaces.** Four OKLCH surfaces themed on Cloud Dancer (warm cream off-white):

```css
--surface-app: oklch(0.955 0.012 85); /* page background */
--surface-card: oklch(0.99 0.006 85); /* cards */
--surface-sunk: oklch(0.935 0.015 85); /* inset wells */
--surface-hover: oklch(0.92 0.018 85);
```

**Ink scale.** Four warm desaturated tones for primary / secondary / tertiary / disabled text. **Lines** at two weights for borders and dividers. **Accent** as a single bronze with a soft background variant and a deeper ink variant for chips and active controls. **Pool tints** for the Pick screen's two pool cards, parametrized so a future palette tweak doesn't require touching components. **Semantic** kept deliberately small: three colors - `--danger`, `--success`, `--info` - each with a `-soft` background variant. `--success` and `--info` exist because the Supabase sync status badge has genuinely distinct synced / offline / error states; collapsing them onto the single accent would erase the very distinction the badge exists to communicate. `--warning` is retired - nothing in the app consumes it, and the minimal palette doesn't budget a hue on speculation. Each semantic color mirrors `--danger`'s construction (text/border at L≈0.55, soft background at L≈0.95).

**Radii / shadows.** Renamed from `--radius-base` / `--shadow-base` to `--r-md` / `--shadow-1` to match the design's compact naming. `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-full` for radii; `--shadow-1`, `--shadow-2`, `--shadow-pop` for the three shadow weights (paper-flat, lifted, sheet-pop).

**Transitions.** Added `--transition-pop: 220ms cubic-bezier(0.32, 0.72, 0, 1)` for sheet slide animations. Existing `--transition-fast` / `--transition-base` retain their names with values matching the spec.

**Responsive primitive.** Added `--bp-app-wide: 820px` to mirror the container-query breakpoint used by `@container app` rules across the app shell.

**Curated flavor palette.** Twelve OKLCH tones at L=0.92 with low chroma (0.022-0.032) evenly spaced across the color wheel. Each entry is a `{ fill, accent, ink }` triple so a single `getFlavorTone(id)` call paints a coherent box card (fill background, accent strip + secondary text, ink primary text). Hash collisions are accepted - with ~11 flavors and 12 entries, two flavors will occasionally share a tone; the flavor name remains the source of truth.

**Container queries.** Layout breakpoints use `@container app (min-width: 820px)` against a `.app { container-type: inline-size; container-name: app; }` root, not `@media` queries. A small `ResizeObserver`-backed `isWide` $state in `App.svelte` mirrors the breakpoint into JS for the few structural swaps CSS alone can't make (sheet vs side panel, FAB vs topbar Add).

## Consequences

### Positive

- Predictable contrast across the entire flavor palette: every `fill` is L=0.92 against an L=0.955 page, every `ink` is L=0.30-0.34. We tune lightness once at the surface level and the rest follows.
- Single function call paints a whole box: `getFlavorTone(id)` returns the three coordinated tones a card needs. No hand-mixing per usage.
- Responsive switches are portable. The app can be embedded inside a fixed-size frame (the design prototype is, and so is the iOS PWA shell on a wide iPad) and the layout still responds to its own width.
- Yearly Pantone re-tune is mechanical: change `--surface-app` and shift the palette `fill` lightness proportionally; nothing else needs to move.
- A future dark mode is a lightness flip on the same `:root` tokens, no component changes needed.

### Negative

- One-time migration cost across every component and route that referenced the old token names. Done in a single PR with a sed-driven rename to keep the diff legible.
- `getFlavorColor(id) → 'hsl(...)'` was renamed to `getFlavorTone(id) → { fill, accent, ink }`. Any downstream caller (only internal in this repo today, but worth flagging) needs the new shape.
- OKLCH browser support is recent (Safari 15.4+, Chrome 111+). Acceptable for this PWA's audience but worth noting.

### Neutral

- The semantic palette is narrower than the pre-2026 system - `--warning` is retired (nothing consumes it; the OPEN-box badge that once used `--color-success-*` now takes the flavor's own accent within the box card). What remains - `--danger`, `--success`, `--info` - is the minimum the current surfaces actually need: destructive actions, and the sync status badge's synced / offline / error states.

## Alternatives Considered

### Alternative 1: Keep hex/rgba, add a third "ink" tone helper

We could have left `getFlavorColor` as-is and added a separate `getFlavorAccentColor(id)` and `getFlavorInkColor(id)`, each running their own hash. Rejected because it doesn't solve the hash-to-HSL "looks the same" failure mode and triples the surface area for color tuning - three independent hash functions would drift over time, and the trio of returned colors might be uncoordinated.

### Alternative 2: HSL with a curated palette (no OKLCH)

We could have kept HSL color expressions and just hand-picked a 12-tone palette. Rejected because HSL lightness is non-perceptual: `hsl(60, 30%, 92%)` (yellow) reads dramatically lighter than `hsl(240, 30%, 92%)` (blue) at the same nominal lightness. OKLCH gives us "every fill reads at the same brightness" for free, which is the whole point of the curated palette.

### Alternative 3: Dual-palette transition (alias old tokens to new ones)

We considered keeping the old `--color-*` names as aliases over the new tokens for a release or two, so consumers could migrate gradually. Rejected because every component and route was being touched in this same PR anyway. Aliases would have meant maintaining two parallel token surfaces with no clear deprecation deadline.

## References

- ADR-005: Original design system decision (superseded for tokens; build/test infrastructure decisions still apply)
- Design handoff: [`docs/design/2026-ux-refresh/README.md`](../design/2026-ux-refresh/README.md) (annotated screenshots in the sibling `screenshots/` directory)
- OKLCH color reference: https://oklch.com
- Pantone Color of the Year 2026: Cloud Dancer
