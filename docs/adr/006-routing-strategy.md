# ADR-006: Client-Side Routing Strategy

**Status:** Accepted

**Date:** 2025-10-28

**Deciders:** Nik (Developer), Claude Code

---

## Context

### Background

BroteinBuddy is a Progressive Web App (PWA) with multiple screens and navigation flows:

- Home screen with main action buttons
- Random flavor selection with confirmation flow
- Inventory management with visual and table views
- Individual box editing
- Drag-and-drop box rearrangement

As a single-page application, we need a client-side routing solution to manage navigation between these screens while maintaining PWA functionality and clean URLs.

### Problem Statement

We need to implement client-side routing that:

1. Works seamlessly with our static PWA deployment on Vercel
2. Supports route parameters (e.g., `/inventory/:boxId/edit`)
3. Maintains browser back/forward button functionality
4. Enables deep linking to specific screens
5. Provides type-safe navigation helpers for developers
6. Has minimal bundle size impact
7. Works reliably with Svelte 5

Additionally, this routing infrastructure must be established BEFORE implementing individual screens (tasks 2.3-2.7) to enable parallel development without App.svelte merge conflicts.

## Decision

We will use **svelte-spa-router** with **hash-based routing** for client-side navigation.

### Implementation Details

**Core Setup:**

- Install `svelte-spa-router` as a production dependency
- Configure App.svelte as a routing container with the Router component
- Define all routes in `src/lib/router/routes.ts`
- Create placeholder components for each route in `src/routes/`

**Route Structure:**

```typescript
export const routes = {
  '/': Home,
  '/random': Random,
  '/random/confirm': RandomConfirm,
  '/inventory': Inventory,
  '/inventory/:boxId/edit': InventoryBoxEdit,
  '/inventory/rearrange': InventoryRearrange,
  '*': NotFound,
};
```

**Type-Safe Navigation:**

```typescript
export const ROUTES = {
  HOME: '/',
  RANDOM: '/random',
  INVENTORY_BOX_EDIT: (boxId: string) => `/inventory/${boxId}/edit`,
  // ... etc
} as const;
```

**URL Format:**
Hash-based routing produces URLs like:

- `https://broteinbuddy.app/#/`
- `https://broteinbuddy.app/#/inventory`
- `https://broteinbuddy.app/#/inventory/box-123/edit`

**Placeholder Pattern:**
Each route gets a minimal placeholder component that:

- Uses design system components (Button)
- Shows "Coming soon" message
- Provides navigation back to home
- Can be replaced with real implementation without touching App.svelte

## Consequences

### Positive

**Deployment Simplicity:**

- Hash-based routing requires zero server configuration
- Vercel serves index.html for all requests automatically
- No need for fallback routes or rewrites
- Works immediately with static hosting

**PWA Compatibility:**

- Hash routing works perfectly for installable PWAs
- No server-side rendering requirements
- Offline-first architecture supported
- Deep linking works from home screen

**Development Workflow:**

- Parallel development enabled (tasks 2.3-2.7 can work simultaneously)
- No App.svelte merge conflicts after initial setup
- Type-safe navigation reduces runtime errors
- Clear separation between routing config and route implementations

**Bundle Size:**

- svelte-spa-router adds only ~6KB to bundle
- Smaller than full-featured routers like SvelteKit's router
- No unnecessary features bloating the bundle

**Developer Experience:**

- Well-documented library with active community
- Simple API, easy to understand
- Works reliably with Svelte 5
- Route parameters with regex validation built-in

### Negative

**URL Aesthetics:**

- Hash URLs (`/#/inventory`) less "clean" than history API URLs (`/inventory`)
- Some users may notice the `#` in the address bar
- Cannot use server-side rendering (not needed for this app)

**SEO Limitations:**

- Hash fragments not crawled by search engines
- Not relevant for utility PWA (not a public content site)
- User-specific data wouldn't be indexed anyway

**Navigation Guards Overhead:**

- If we need route guards later, requires manual implementation
- Not as feature-rich as SvelteKit routing
- No layout nesting out of the box

### Neutral

**Client-Side Only:**

- All routing logic happens in the browser
- No server round-trips for navigation
- Trade-off: can't use server-side validation, but we don't need it

**Learning Curve:**

- Team needs to learn svelte-spa-router API
- Different from SvelteKit's file-based routing
- Trade-off: simpler mental model, more explicit

**Testing Strategy:**

- Requires E2E tests for routing behavior
- Unit tests limited to route configuration logic
- Same testing burden as any routing solution

## Alternatives Considered

### Alternative 1: tinro

**Description:**
Lightweight routing library (~3KB) with history API support.

**Why Not Chosen:**

- History API requires server fallback configuration on Vercel
- Smaller community and less documentation than svelte-spa-router
- Clean URLs not worth the deployment complexity for a PWA
- We'd need to configure Vercel rewrites: `{ "source": "/:path*", "destination": "/index.html" }`

**Trade-offs:**

- Would get cleaner URLs without `#`
- Would add deployment configuration complexity
- Would require Vercel project-specific setup
- Smaller bundle (3KB vs 6KB), but 3KB savings negligible for PWA

### Alternative 2: SvelteKit Routing

**Description:**
Use SvelteKit's full-featured file-based routing system.

**Why Not Chosen:**

- Massive framework overhead for a simple PWA (~50KB+ additional bundle size)
- Requires SvelteKit build setup, not compatible with Vite-only setup
- File-based routing in `src/routes/+page.svelte` pattern
- Overkill for client-side-only PWA
- Would require complete project restructure (Phase 0 already complete)

**Trade-offs:**

- Would get server-side rendering capability (don't need)
- Would get advanced features like layouts, load functions (don't need)
- Would add significant complexity and bundle size
- Would require scrapping existing Vite setup

### Alternative 3: Custom Hash Router

**Description:**
Build our own minimal hash-based router using window.location.hash and hashchange events.

**Why Not Chosen:**

- Would save ~4-5KB in bundle size
- Requires significant development and testing time
- Reinventing the wheel when proven solution exists
- No route parameter parsing built-in
- No active route detection utilities
- Maintenance burden falls entirely on our team

**Trade-offs:**

- Complete control over implementation
- Learning opportunity
- Development time better spent on features
- Higher risk of edge case bugs

### Alternative 4: Page.js

**Description:**
Minimalist client-side router with history API support (~2KB).

**Why Not Chosen:**

- Not Svelte-specific, requires more manual integration
- History API requires server configuration (same as tinro)
- Less idiomatic for Svelte developers
- No built-in Svelte component integration

**Trade-offs:**

- Very lightweight
- Framework-agnostic (could reuse if switching frameworks)
- More boilerplate code needed for Svelte integration

## References

- [svelte-spa-router GitHub](https://github.com/ItalyPaleAle/svelte-spa-router)
- [svelte-spa-router Documentation](https://github.com/ItalyPaleAle/svelte-spa-router/tree/master/README.md)
- [Hash-based routing vs History API](https://stackoverflow.com/questions/36289683/what-is-the-difference-between-hash-and-history-html5-api-for-client-side-routi)
- [ADR-001: Technology Stack Selection](./001-technology-stack-selection.md) (PWA deployment strategy)
- [ADR-005: Design System](./005-design-system.md) (Button component used in placeholders)
- [PLAN.md Section 2.2](../../.planning/PLAN.md) (Routing infrastructure requirements)
