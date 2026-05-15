# Handoff: BroteinBuddy UX Refresh (2026)

## Overview

A non-trivial UX refresh for the existing BroteinBuddy Svelte PWA. Five user-driven fixes plus a new top-level navigation pattern:

1. **Sophisticated color palette** — replaces the saturated HSL rainbow with a curated, low-chroma palette themed on **Pantone Cloud Dancer (2026 Color of the Year)**. Yearly re-tuning is intended.
2. **Square box rendering** — boxes now use `aspect-ratio: 1 / 1` instead of stretching wide.
3. **NumberPad capped to real input ranges** — 1–3 for closed-box count, 1–12 for open-box bottles, with a small "Use keyboard" fallback link.
4. **Visual location picker** — when adding inventory, the user taps an empty slot in a mini stack diagram instead of typing stack/height numbers.
5. **Responsive on phone + laptop** — same component, container-query-driven layout swap (bottom sheet vs. side panel; tab bar vs. left rail).

Plus:

6. **Unified persistent navigation** — Pick / Inventory / More. Bottom tab bar on phone, slim left rail on laptop. Pick is the **default landing screen** because the user reports spending ~85% of their time there. Deep flows (Edit Box) keep the nav visible as an escape hatch and add a contextual `‹ Inventory` back button.
7. **Inventory split into Active / Storage** — stacks with at least one open box go in the "Active" section; sealed-only stacks go in "Storage". 3-per-row grid on both viewports so the user's physical mental model ("3 wide, 2 deep") is preserved. Stacks are bottom-aligned within each section so taller stacks rise higher (buildings, not columns).
8. **Pick result sheet** — after a random pick, a bottom sheet shows the flavor, exact location, and a "Taking it · −1" commit button.

The tokens are structured so a dark theme can be added later by overriding `:root` custom properties inside a `@media (prefers-color-scheme: dark)` block — no component changes needed.

## About the Design Files

The files in this bundle are **design references created in HTML/React** — a working prototype showing intended look, layout, and interaction. They are **not production code to copy directly**.

Your task is to **recreate these designs in the existing BroteinBuddy Svelte 5 + TypeScript + svelte-spa-router codebase**, using the project's established patterns (route components in `src/routes/`, reusable components in `src/lib/components/`, design tokens in `src/styles/variables.css`, stores in `src/lib/stores.ts`). The prototype is deliberately self-contained React so you can read it, run it, and lift values; the actual implementation lives in Svelte.

## Fidelity

**High-fidelity.** Colors, typography, spacing, border radii, shadows, transitions, and copy are all final and intended. Translate exact OKLCH values and spacing into the existing token system (`variables.css`). Where this design conflicts with an existing token (e.g. `--color-primary`), prefer the new value.

## Files in This Handoff

| File                                 | Purpose                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `BroteinBuddy Redesign.html`         | Entry point — design canvas with phone + laptop artboards                                                                             |
| `app.jsx`                            | All redesigned components (Pick, Inventory, Box, NumberPad, LocationPicker, AddInventoryPanel, BoxEdit, MoreScreen, App with routing) |
| `styles.css`                         | Full design token system + every component style                                                                                      |
| `ios-frame.jsx`, `design-canvas.jsx` | Scaffolding so you can open the HTML and see the prototype live in a browser. Not part of the deliverable.                            |
| `screenshots/`                       | Annotated PNG references for every screen and state. See the **Screenshots** section below for what each one shows.                   |

Open `BroteinBuddy Redesign.html` in a browser to interact with the prototype. The two artboards render the same React `<App />` at phone (390×844) and laptop (1280×800) dimensions.

## Screenshots

The `screenshots/` folder contains 10 reference images. Order matches the implementation order I'd suggest (build phone first, then port responsive variants).

| File                          | Shows                                                                                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-pick-phone.png`           | **Pick** screen on phone — default route, two big pool buttons, Set Favorite pill, "choose a specific flavor" link, persistent bottom tab bar (Pick active)                                                                      |
| `02-pick-result-phone.png`    | Pick **result sheet** sliding up after a pool tap — flavor name, location, qty, Pick again / Taking it · −1 actions                                                                                                              |
| `03-inventory-phone.png`      | **Inventory** screen on phone — tally, filter chips, Active section (3-per-row grid, bottom-aligned stacks), floating Add inventory FAB, tab bar                                                                                 |
| `04-add-inv-sheet-phone.png`  | **Add Inventory bottom sheet** open on phone, on the closed-detail step — flavor list, "How many boxes? · 12 bottles each" with 1/2/3 numpad, footer with Back/Cancel/Add                                                        |
| `05-edit-box-phone.png`       | **Box Edit** deep flow on phone — `‹ Inventory · Edit box` stage header, hero card in flavor tint, qty stepper, Sealed/Open seg, tab bar still visible (escape hatch)                                                            |
| `06-pick-laptop.png`          | Pick screen on laptop — left rail nav, max-width centered content, larger type, same two pool buttons                                                                                                                            |
| `07-inventory-laptop.png`     | Inventory on laptop — left rail, topbar with `+ Add inventory` CTA, 3-per-row grid wider, bottom-aligned stacks                                                                                                                  |
| `08-add-inv-panel-laptop.png` | Add Inventory **side panel** on laptop — inventory list still visible on left, panel on right with flavor list and dynamic confirm label (`Add 3 boxes · 36 bottles`)                                                            |
| `09-location-picker.png`      | **Visual location picker** isolated — Auto/Pick spot toggle, stack diagram with existing boxes as colored cells (initials + qty), dashed `+` empty slots at stack tops, NEW stack column on the right, selected slot highlighted |
| `10-edit-box-laptop.png`      | Box Edit deep flow on laptop — same stage header, larger centered hero, same form, sticky Cancel/Save footer                                                                                                                     |

> Notes:
>
> - The dark background around each frame is just the screenshot canvas — the real app background is the warm Cloud Dancer cream inside the frame.
> - The flavor color "Chocolate Wintermint" in the result sheet shares a lavender tint with Chocolate; this is the documented hash-collision behavior of the curated palette.

## Codebase Mapping

The existing Svelte structure (from `src/routes/`, `src/lib/components/`):

| New design                              | Where it goes in the codebase                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistent nav (tab bar / rail)         | New component `src/lib/components/AppNav.svelte`; render in `src/App.svelte` outside the router outlet                                       |
| Pick screen                             | Replace `src/routes/Home.svelte` (this is the default route per `routes.ts`)                                                                 |
| Inventory split (Active / Storage)      | Update `src/routes/Inventory.svelte`                                                                                                         |
| Square Box card                         | Update inline box-visual styles in `Inventory.svelte` (or extract to a new `BoxCard.svelte`)                                                 |
| NumberPad                               | Update `src/lib/components/NumberPad.svelte` — change default `max` ceiling, add column-count prop, restyle the "Use keyboard" button        |
| Location picker                         | Replace the two number inputs in `src/lib/components/AddInventoryModal.svelte` with a `LocationPicker.svelte`                                |
| Add Inventory bottom sheet / side panel | Restructure `AddInventoryModal.svelte` — keep modal behavior on phone (or convert to bottom sheet), inline as right-side `<aside>` on laptop |
| Box Edit screen                         | Update `src/routes/InventoryBoxEdit.svelte` with stage-header pattern                                                                        |
| Pick result sheet                       | New screen-component used after the random pick lands                                                                                        |
| Design tokens                           | Rewrite `src/styles/variables.css` (see token table below)                                                                                   |
| Flavor color hash                       | Replace `src/lib/utils/flavor-color.ts` — return a `{ fill, accent, ink }` triple from a curated palette, not raw HSL                        |

The existing `routes.ts` is fine. The picker→confirm flow (`Random.svelte` + `RandomConfirm.svelte`) collapses into the new Pick screen + result sheet — consider whether to keep two routes or merge.

## Design Tokens

All colors in **OKLCH** for predictable perceptual lightness. Copy these verbatim into `src/styles/variables.css`, replacing the existing palette and surface tokens.

### Surfaces (Cloud Dancer)

```css
--surface-app: oklch(0.955 0.012 85); /* page bg — Cloud Dancer */
--surface-card: oklch(0.99 0.006 85); /* cards */
--surface-sunk: oklch(0.935 0.015 85); /* inset wells */
--surface-hover: oklch(0.92 0.018 85);
```

> **Yearly re-tune:** Cloud Dancer is the 2026 Pantone Color of the Year. When updating for next year's PCOY, change `--surface-app` and shift the four other surface lightness values proportionally. The flavor palette's `fill` lightness should track `--surface-app` (currently L≈0.92 against L≈0.955 background).

### Ink

```css
--ink-1: oklch(0.24 0.012 70); /* primary text */
--ink-2: oklch(0.44 0.012 70); /* secondary */
--ink-3: oklch(0.62 0.012 70); /* tertiary / placeholder */
--ink-4: oklch(0.78 0.012 70); /* disabled / dividers strong */
```

### Lines

```css
--line-1: oklch(0.9 0.012 80);
--line-2: oklch(0.85 0.014 80);
```

### Accent (single restrained bronze)

```css
--accent: oklch(0.55 0.08 65);
--accent-soft: oklch(0.93 0.025 70);
--accent-ink: oklch(0.38 0.08 65);
```

### Semantic

```css
--danger: oklch(0.55 0.13 28);
--danger-soft: oklch(0.95 0.025 28);
```

### Pool tints (Pick screen card backgrounds)

```css
/* Caffeinated card */
--pool-caff-bg: oklch(0.94 0.028 65);
--pool-caff-line: oklch(0.86 0.04 65);
--pool-caff-glyph-bg: oklch(0.88 0.05 65);
--pool-caff-ink: oklch(0.32 0.06 65);
--pool-caff-ink-soft: oklch(0.5 0.05 65);

/* Caffeine-free card */
--pool-decaf-bg: oklch(0.94 0.024 175);
--pool-decaf-line: oklch(0.86 0.035 180);
--pool-decaf-glyph-bg: oklch(0.88 0.04 180);
--pool-decaf-ink: oklch(0.32 0.05 180);
--pool-decaf-ink-soft: oklch(0.5 0.04 180);
```

### Typography

```css
--font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif;
--font-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', monospace;
/* Base: 15px / 1.4 line-height, antialiased. Sizes are intentionally
   inlined per-component rather than a centralized scale — the new
   designs use specific sizes (22px box qty, 28-36px screen titles,
   13-15px body) more than a strict ratio scale. */
```

### Radii

```css
--r-sm: 6px;
--r-md: 10px;
--r-lg: 14px;
--r-xl: 20px;
```

### Shadows (flat / paper)

```css
--shadow-1: 0 1px 0 oklch(0.85 0.008 80 / 0.4), 0 1px 2px oklch(0 0 0 / 0.04);
--shadow-2: 0 1px 0 oklch(0.85 0.008 80 / 0.5), 0 6px 18px oklch(0 0 0 / 0.06);
--shadow-pop: 0 12px 40px oklch(0 0 0 / 0.18);
```

### Transitions

```css
--transition-fast: 120ms;
--transition-base: 220ms;
--transition-pop: 220ms cubic-bezier(0.32, 0.72, 0, 1); /* sheet slide */
```

## Flavor Palette

Replaces the HSL-from-hash approach in `flavor-color.ts`. 12 curated hues at L≈0.92, low chroma, evenly distributed across the color wheel. Each entry has three values used together: `fill` for box background, `accent` for the left strip + secondary text, `ink` for primary text on the fill.

```ts
export type FlavorTone = { fill: string; accent: string; ink: string };

export const PALETTE: FlavorTone[] = [
  { fill: 'oklch(0.92 0.030 35)', accent: 'oklch(0.52 0.09 35)', ink: 'oklch(0.32 0.06 35)' }, // terracotta
  { fill: 'oklch(0.92 0.028 60)', accent: 'oklch(0.55 0.08 65)', ink: 'oklch(0.34 0.05 65)' }, // clay
  { fill: 'oklch(0.92 0.032 85)', accent: 'oklch(0.56 0.08 85)', ink: 'oklch(0.34 0.06 85)' }, // ochre
  { fill: 'oklch(0.92 0.026 115)', accent: 'oklch(0.50 0.07 120)', ink: 'oklch(0.30 0.05 120)' }, // moss
  { fill: 'oklch(0.92 0.022 150)', accent: 'oklch(0.50 0.06 150)', ink: 'oklch(0.30 0.04 150)' }, // sage
  { fill: 'oklch(0.92 0.022 175)', accent: 'oklch(0.50 0.06 180)', ink: 'oklch(0.30 0.04 180)' }, // fern
  { fill: 'oklch(0.92 0.022 205)', accent: 'oklch(0.50 0.06 210)', ink: 'oklch(0.30 0.04 210)' }, // mist
  { fill: 'oklch(0.92 0.022 240)', accent: 'oklch(0.50 0.06 240)', ink: 'oklch(0.30 0.04 240)' }, // slate
  { fill: 'oklch(0.92 0.026 265)', accent: 'oklch(0.50 0.07 265)', ink: 'oklch(0.30 0.05 265)' }, // periwinkle
  { fill: 'oklch(0.92 0.026 295)', accent: 'oklch(0.52 0.07 295)', ink: 'oklch(0.32 0.05 295)' }, // lavender
  { fill: 'oklch(0.92 0.028 325)', accent: 'oklch(0.52 0.08 325)', ink: 'oklch(0.32 0.06 325)' }, // mauve
  { fill: 'oklch(0.92 0.028 355)', accent: 'oklch(0.52 0.08 355)', ink: 'oklch(0.32 0.06 355)' }, // rose
];

export function getFlavorTone(flavorId: string): FlavorTone {
  let h = flavorId.length * 17;
  for (let i = 0; i < flavorId.length; i++) {
    h = (flavorId.charCodeAt(i) * 31 + (h << 5) - h) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}
```

Note: with ~11 flavors and 12 palette entries, hash collisions will occur (e.g. Chocolate and Peanut Butter may share a tone). This is acceptable — the palette differentiates _visually_, not as a unique identifier. The flavor name remains the source of truth.

## Screens

### 1. Pick (default route)

The 85%-of-time screen. Two huge tap targets, fast one-tap.

**Layout (phone):**

- 24px / 20px / 32px padding (top / sides / bottom)
- 18px gap between sections
- Optional bottom sheet overlay for pick result

**Layout (laptop, container ≥ 820px):**

- 48px padding, max-width 720px, centered, 28px gap

**Components, top to bottom:**

1. **Greeting block**
   - Eyebrow: `TIME FOR A SHAKE` — uppercase, 14px, weight 500, letter-spacing 0.04em, color `--ink-3`
   - H2: `Pick a flavor` — 28px (mobile) / 36px (laptop), weight 700, letter-spacing -0.02em, color `--ink-1`

2. **Pool buttons** (two stacked, 12px gap mobile / 16px laptop)
   - Padding: 22px (mobile) / 28px (laptop)
   - Border-radius: `--r-lg` (14px)
   - 3-column grid inside each button: 56px glyph circle | label stack | chevron
   - **Glyph circle:** 56×56 (mobile) / 64×64 (laptop), circular, tinted background, 32–36px emoji centered (⚡ for caffeinated, 💪 for caffeine-free)
   - **Label:** flavor pool name 22–26px weight 700, subline "{N} bottles in pool" 13px in pool-ink-soft
   - **Chevron:** `›` glyph, 28px, weight 300, in pool-ink-soft
   - Hover: `transform: translateY(-1px)` + `--shadow-2`
   - Disabled when pool count is 0 (opacity 0.5, no hover)
   - Use `--pool-caff-*` / `--pool-decaf-*` tokens

3. **Secondary actions**
   - **Set Favorite pill** — full width, 1px dashed `--line-2` border when unset, solid when set. Shows `♡` (or `❤`) in a 28px circle, "Set a favorite for one-tap picks" / "{flavor name}" label, `›` chevron.
   - **"Or choose a specific flavor →"** — small text link, centered, 14px, underlined with `--line-2` color, 4px underline offset.

4. **Pick result sheet (overlay)**
   - Slides up from bottom with `--transition-pop`. Backdrop `oklch(0 0 0 / 0.32)`.
   - Sheet has top corners radius 18px, padding 10px / 20px / 20px.
   - 4px wide × 36px tall grabber at the top center, `--line-2`.
   - Eyebrow "Your shake" + flavor name 32px weight 700 in the flavor's `ink` tone.
   - Result card: flavor's `fill` background, `accent`-color border, padding 18px, radius `--r-lg`. Two lines:
     - Location: monospace 13px `Stack {n} · Row {h}`
     - Quantity: 24px weight 700, "{n}" with " bottles left in box" in 13px weight 500 same color at 0.75 opacity
   - Footer row: two equal-flex buttons — `Pick again` (ghost) and `Taking it · −1` (primary). Latter decrements quantity and dismisses.

**State:**

- Pool selection runs a weighted random across in-stock boxes in that pool (existing `random-selection.ts` logic, just present the result differently).
- Open boxes should still be preferred — current weighting is fine.
- "Taking it" calls the existing decrement-quantity action.

---

### 2. Inventory

**Layout (phone):**

- 18px padding, 18px gap between sections
- Sticky FAB at bottom: round-pill `Add inventory` button, `--ink-1` background, surface-card text, weight 600, shadow-2, sits in a 96px bottom gutter with a top→down gradient fade from `--surface-app` so it lifts off the boxes below

**Layout (laptop):**

- 28/32px padding, 24px gap, no FAB. Topbar shows `+ Add inventory` button at top-right.

**Top of screen:**

- **Tally row:** `{N}` (22px weight 700) `boxes` (13px weight 500 `--ink-3`) `{M}` `bottles`. Tabular numerals.
- **Filter chips:** `All` / `⚡ Caffeinated` / `💪 Decaf`. Pill-shaped, 1px `--line-2` border, 13px label. Pressed state: `--ink-1` background, surface-card text.

**Stack sections** (only render if section has content):

**Active** — stacks containing at least one open box.
**Storage** — stacks with only sealed boxes.

Each section has:

- **Section head:** `● Active` (or `Storage`) on left — 13px weight 600 uppercase letter-spacing 0.04em, in `--ink-2`, with a 7px dot prefixed (accent color for Active, `--ink-4` for Storage). On right: `{N} stacks · in use` (or `sealed`), 11px `--ink-3`.
- **3-column grid** of stacks, `align-items: end` so taller stacks rise higher within their row. Gap 10px (mobile) / 18px (laptop).

**Stack:**

- Column of boxes, sorted height-ascending in DOM but rendered with `flex-direction: column-reverse` so height 1 sits at the bottom of the visual pile.
- 6–8px gap between boxes.
- **Stack footer** at the bottom: thin top border in `--line-1`, padding 4/6/2px, holds `S{n}` (monospace 11px `--ink-3`) on left and `{total} btl` (11px tabular, `--ink-3`) on right.

**Box card** (square — `aspect-ratio: 1 / 1`):

- Background: flavor's `fill` token
- Border: 1px `--line-2`
- Border-radius: `--r-md` (10px)
- Padding: 9px / 10px / 9px / 12px (extra left padding to clear the accent strip)
- **Left accent strip:** 4px wide, full height, flavor's `accent` color, only top/bottom-left corners rounded
- **Flavor name:** 13px weight 600, line-clamp 2, balance text wrap. Color: flavor's `ink`.
- **Quantity:** big number 22px weight 600 tabular, with `BTL` suffix 10px uppercase letter-spacing 0.06em in pool-ink-soft
- **`OPEN` tag** when `box.isOpen`: 9.5px uppercase letter-spacing 0.08em, 3/6px padding, `--r-sm` radius, background `oklch(1 0 0 / 0.5)`, color is flavor's accent.
- **Container queries** on the box itself: at container width ≤130px scale down (qty 18px, name 12px). At ≤110px (which happens on phone 3-col), qty 16px, name 11px with line-clamp 1, hide the OPEN tag.
- Hover: `translateY(-1px)` + `--shadow-2`.
- **Box is a `<button>`** — full-card tap target. Clicking navigates to `InventoryBoxEdit`.

**Out-of-stock section** (only if any flavor has zero boxes): a flex-wrap row of pills. Each pill: 1px `--line-2` border, 999px radius, padding 6/12/6/8px, font 13px `--ink-2`, with a 8px dot prefix in that flavor's accent at 0.55 opacity.

---

### 3. Add Inventory (panel on laptop, bottom sheet on phone)

Same component renders in both contexts. The form lives in `.panel-body` (overflow-y auto), with header/footer pinned.

**Step 1 — Mode select:**

- Hint: "What are you adding?"
- Two stacked cards (`.mode-card`): full-width buttons with title (15px weight 600) + 13px subtitle in `--ink-2`. Hover deepens border + sets `--surface-hover` background.
  - **Closed boxes** — "Sealed boxes — 12 bottles each"
  - **Open box** — "Partially used box, custom bottle count"

**Step 2 — Closed-detail or Open-detail:**

1. **Flavor list** — header `FLAVOR`. A scrollable column of radio-row buttons inside `--surface-sunk`, max-height 180px. Each row: 14px swatch (flavor's accent), name, `CAFF` / `DECAF` pool badge on right in 11px uppercase. Pressed row gets surface-card background, weight 600, shadow-1.

2. **NumberPad**
   - Header label: for closed mode, `How many boxes? · 12 bottles each`. For open, `Bottles in the open box`.
   - 4-column grid (or 3-column when max ≤ 6) of square buttons, min-height 44px, font 16px weight 500 tabular.
   - Closed-mode max: **3**. Open-mode max: **12**.
   - Pressed button: `--ink-1` bg, surface-card text, weight 600.
   - Below the grid, a small underlined "Need a different number? Use keyboard" link in `--ink-3` 12px. Calling code can wire this to the existing keyboard input modal as a fallback.

3. **Location picker** (`LocationPicker.svelte`)
   - **Head row:** `LOCATION` field-label on left. Segmented control `Auto | Pick spot` on right (3px-padded, surface-sunk background, rounded). Pressed segment = surface-card + shadow-1.
   - **Readout line:** `Will place at Stack 4 · Row 1 (next available)` in Auto mode, `Placing at Stack 4 · Row 1` in Pick mode.
   - **Grid container:** `--surface-sunk` bg, `--line-1` border, `--r-md` radius, 12px padding, overflow-x auto for many stacks.
   - **Stacks row:** flex row, `align-items: flex-end` (so all stacks share a baseline). Per stack column:
     - Top cell: dashed-outline empty `+` slot at `topH + 1` height (visible only in Pick mode)
     - Below: existing boxes rendered top-down in descending height order, each cell shows initials (e.g. `CC` for Cookies & Cream) and quantity
     - `S{n}` label at the bottom
   - **New-stack column:** a single `+` slot, visually separated by a left dashed border + 8px left padding + 4px left margin. Label `NEW` below it.
   - **Suggested slot:** the cell at `suggestNextLocation` gets a solid `--accent` border + `--accent-soft` bg + `--accent-ink` text by default.
   - **Selected slot:** 2px solid `--accent` border + `--accent-soft` bg + `--accent-ink` text + weight 700.
   - **Empty cell hover:** `--accent` border, `--accent-soft` bg.
   - **Existing-box cells:** 44×44, flavor's fill bg, flavor's ink text, showing initials 11px weight 700 + qty 9px monospace 0.7 opacity.
   - Hint text below: "Tap any dashed slot above to place the box there. Existing boxes are read-only."

4. **Footer actions:** `Back` (ghost), `Cancel` (ghost), `Add 3 boxes · 36 bottles` (primary) — confirm label dynamically shows total bottles for closed mode, or `Add open box (N)` for open. Disabled until flavor + count are set.

**Responsive behavior:**

| Container width | Container                                                                         | Trigger                                 |
| --------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| < 820px         | Bottom sheet (rounded top, slides from bottom, grabber on top, 92% max-height)    | Round FAB at bottom of Inventory screen |
| ≥ 820px         | Right-side panel (380px fixed width, full height, slides into grid as 2nd column) | `+ Add inventory` button in topbar      |

The sheet uses `transform: translateY(100%) → 0` with `--transition-pop`. Backdrop is a separate sibling `.sheet-backdrop` (also `oklch(0 0 0 / 0.32)`).

**Critical layout note:** the sheet + backdrop must be **siblings of `.app-shell`** (so they're positioned against `.app`), NOT children of `.main`. Otherwise the closed sheet's `translateY(100%)` puts it at the bottom of `.main` (above the nav), where it visibly overlaps the tab bar.

---

### 4. Box Edit (deep flow)

Replaces the inventory pane when `editingBoxId` is set. Tab bar stays visible (escape hatch).

**Stage header** (replaces the topbar for this screen):

- `‹ Inventory` back button on left — 14px weight 500 in `--ink-2`, hover lifts to `--ink-1` and `--surface-hover`. The `‹` glyph is 18px.
- Stage title `Edit box` — 15px weight 600 `--ink-1`.
- 12/12/8px padding, `--line-1` bottom border.

**Hero card** (at top of body):

- Background, border, and text colors all from the flavor's tone tokens (`fill`, `accent`, `ink`).
- 16/18px padding, `--r-md` radius, 1px border.
- Two-line: flavor name 18px weight 700, then monospace `Stack {n} · Row {h}` in `accent`.

**Quantity stepper:**

- Field label `Bottles remaining`
- Inline stepper: `−` 44×44 button, big readout 24px weight 600 tabular (min-width 64px), `+` 44×44 button. Wrapped in 4px-padded `--surface-sunk` pill with `--line-1` border.
- `−` disabled at 0, `+` disabled at 12.
- Hint below: "A full closed box has 12 bottles."

**Status segmented:**

- Label `Status`. Two-segment control: `Sealed | Open`. Same `.seg` style as the Location picker mode toggle.

**Danger row:**

- Outline destructive button: `Remove box`. Transparent bg, 1px `--danger` border, `--danger` text. Hover: `--danger-soft` bg.

**Sticky footer:**

- `position: sticky; bottom: 0;`
- `Cancel` (ghost) + `Save` (primary), right-aligned. 14px padding.

**State:** local copy of `quantity` and `isOpen` until Save. Save dispatches a store update; Delete dispatches a remove + navigates back. Cancel navigates back without writing.

---

### 5. More

Lightweight placeholder for now — three list-row pills linking to existing functionality:

- ↻ Backup & restore → opens `BackupRestoreModal`
- ⇄ Rearrange stacks → navigates to `InventoryRearrange`
- ⚙ Settings → placeholder

Uses the same screen padding and large-title pattern as Pick.

## Navigation

**3 destinations:** Pick · Inventory · More. Pick is the **default route on app launch**.

### Phone (container < 820px)

Bottom tab bar:

- `.nav` is a flex row, surface-card background, 1px top border in `--line-1`.
- Each `.nav-item`: column flex (icon over label), 22px emoji glyph, 11px label weight 500, 8/4/10px padding, full flex.
- **Active item** (`aria-current="page"`): bolder label, `--ink-1` color, scaled glyph (1.06×), and a 28×2px black bar at the top center of the tab (border-radius 0/0/2/2px) — like an iOS native indicator.

### Laptop (container ≥ 820px)

Left rail:

- Same `.nav` element, but `flex-direction: column`, 72px wide, 12/0 padding, 4px gap, right border `--line-1`, `--surface-app` background (not card).
- Items: 12/4 padding, 10px label, 20px glyph.
- Active-item indicator becomes a 3×28px vertical bar on the left edge (border-radius 0/2/2/0px).

### Grid template

Use CSS grid template areas on `.app-shell`:

```css
/* Phone */
grid-template-areas:
  'topbar'
  'main'
  'nav';
grid-template-rows: auto 1fr auto;
grid-template-columns: 1fr;

/* Laptop */
grid-template-areas:
  'nav topbar'
  'nav main';
grid-template-rows: auto 1fr;
grid-template-columns: 72px 1fr;
```

### Topbar visibility

Show the topbar **only** on Inventory when at laptop width — that's the only screen that needs a topbar action (the `+ Add inventory` button). Pick and More have their own large titles inside the stage. Box Edit uses the stage-header instead. When the topbar isn't rendered, its grid row collapses to `auto = 0px` and `main` fills the vacated space — no special-case CSS needed.

## Responsive Strategy

The `.app` root uses `container-type: inline-size` with `container-name: app`. All breakpoint-style overrides are `@container app (min-width: 820px)`. **Do not use media queries** for these — the app is rendered inside a fixed-size frame in the prototype, and may eventually be embedded in other contexts too. Container queries make it portable.

Component-internal responsive moves (e.g. Box typography shrinking at narrow widths) use the component's own container queries — the Box has its own `container-type: inline-size`.

The `isWide` flag in React is used to gate **structural** changes (sheet vs. side panel, FAB vs. topbar button) where CSS alone isn't enough. Drive this from a `ResizeObserver` on the app root, synchronously initialized to avoid first-paint flash:

```js
useEffect(() => {
  if (!appRef.current) return;
  setIsWide(appRef.current.offsetWidth >= 820);
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) setIsWide(e.contentRect.width >= 820);
  });
  ro.observe(appRef.current);
  return () => ro.disconnect();
}, []);
```

## State Management

Add to `src/lib/stores.ts` (or use route-level state where appropriate):

- `currentScreen: 'pick' | 'inventory' | 'more'` — tab selection. Existing svelte-spa-router routes can drive this from `location` if you prefer URL-based.
- `pickResult: { box, flavor } | null` — last picker result, shown in the result sheet. Cleared by Pick-again or commit.
- `addInventoryOpen: boolean` — for the sheet/panel. Local to Inventory route.
- `editingBoxId: string | null` — drives the Box Edit deep flow. Local to Inventory route.

Existing stores (`appState`, `selectedFlavorId`, `selectedPool`) all keep their roles.

## Interactions Reference

| Action                                        | What happens                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| Open app                                      | Routes to `/` → Pick screen                                             |
| Tap pool button                               | Weighted random pick, opens result sheet                                |
| Tap "Pick again" in result                    | Re-runs pick in same pool, replaces result                              |
| Tap "Taking it · −1"                          | Decrements box quantity by 1, closes sheet, returns to Pick             |
| Tap a tab                                     | Switches screen, preserves screen-local state                           |
| Tap a box card                                | Routes to `/inventory/:id/edit`                                         |
| Tap `‹ Inventory` in Box Edit                 | Navigates back to inventory list                                        |
| Tap FAB / topbar "+ Add inventory"            | Opens sheet (phone) or side panel (laptop)                              |
| Tap any `+` empty slot in location picker     | Selects that slot, updates readout                                      |
| Tap Auto/Pick spot toggle                     | Switches between suggested-location and tap-to-pick mode                |
| Adding ≥ 2 closed boxes in Auto location mode | Subsequent boxes stack automatically above box 1; the hint copy says so |

## Animations & Transitions

- **Hover lift** on cards/boxes: `transform: translateY(-1px)`, `--shadow-2`, 120ms ease.
- **Sheet open**: `transform: translateY(100%) → 0` over 220ms `cubic-bezier(0.32, 0.72, 0, 1)`.
- **Sheet backdrop**: opacity 0 → 1 over 180ms ease.
- **Tab active indicator**: subtle 1.06× glyph scale on active, 120ms ease.

## Edge Cases & Empty States

- **Empty pool:** disable the pool button (opacity 0.5, no hover, no click) and the subline still shows "0 bottles in pool". Don't hide the button — its presence communicates the option exists.
- **No boxes at all:** Inventory shows a centered "No boxes match this filter." in 40px padding, `--ink-3` color.
- **All stacks active or all storage:** only render the section(s) with content.
- **First-ever box (empty inventory):** location picker shows only the "NEW" column with a + at Stack 1, Row 1.

## Accessibility

- All tab buttons use `aria-current="page"` for the active state, not `aria-selected` (this is navigation, not a tablist).
- Numpad buttons use `aria-pressed`. NumberPad group has `role="group"` + `aria-labelledby` linking to the field label.
- LocationPicker mode toggle is a `<div role="group">` with `aria-pressed` buttons; existing-box cells have `title` tooltips with flavor + quantity.
- Box cards are real `<button>` elements (full-card tap target), not `<div role="button">`.
- Sheet has `role="dialog" aria-modal="true"`.
- Maintain WCAG AA contrast — the OKLCH values above are tuned for ≥ 4.5:1 of `--ink-1`/`--ink-2` on `--surface-app`/`--surface-card`/flavor `fill` tones. The existing `variables.css` already documents this concern; honor it.

## Things to Verify After Implementation

1. Pick screen renders 0-state correctly when both pools are empty (e.g. fresh install before adding anything).
2. Adding inventory at Stack N, Height 1 when Stack N-1 doesn't exist: re-use existing `validateLocationNoGaps` — the new picker should never let the user select an invalid slot, but defensive validation should remain.
3. Sheet doesn't trap the user on closed → open → close. Test grabber drag-to-dismiss if you implement it.
4. Tab bar persists during Box Edit and remains the user's escape hatch.
5. Color contrast against the new Cloud Dancer base — eyeball the box-name color on the lightest tints (sage, fern, mist) and the boldest (terracotta, mauve).
6. Container queries: shrink the laptop frame across the 820px boundary and watch layout swap (rail ↔ tab bar, side panel ↔ sheet, topbar appear/disappear).

## Future (out of scope for this handoff but designed-in)

- **Dark mode.** Override the same `:root` tokens inside `@media (prefers-color-scheme: dark)`. No component changes needed. Suggested surface set: `--surface-app: oklch(0.18 0.012 80)`, `--surface-card: oklch(0.22 0.012 80)`, swap ink lightness above 0.7.
- **Yearly Pantone re-tune.** When the next PCOY drops, change `--surface-app` and adjust the palette `fill` lightness to maintain the same delta against the new base.
- **Set a Favorite** — wire the "Set a favorite" pill on Pick to open a flavor-picker sheet that writes `favoriteFlavorId`, then show the flavor name in the pill.

---

If anything in this spec is ambiguous, open `BroteinBuddy Redesign.html` in a browser and inspect the actual element — the prototype is the authoritative reference.
