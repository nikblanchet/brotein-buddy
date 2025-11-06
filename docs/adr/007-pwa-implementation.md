# ADR-007: Progressive Web App Implementation

**Status:** Accepted

**Date:** 2025-11-06

**Deciders:** Nik (Developer), Claude Code (Implementation Assistant)

---

## Context

BroteinBuddy is designed as a mobile-first web application for tracking protein shake inventory. To provide a native app-like experience on iOS devices, we need to implement Progressive Web App (PWA) functionality that enables:

- Installation to the iOS home screen
- Offline functionality using cached assets
- Standalone display mode (full-screen without browser chrome)
- Fast loading through service worker caching
- App-like appearance with custom icons and splash screens

### Background

The project's tech stack (ADR-001) explicitly chose PWA over native mobile development to maintain a single codebase while providing an installable, offline-capable application. iOS Safari has supported PWA features since iOS 11.3, making it a viable option for our target platform.

The application stores all data in LocalStorage (ADR-003), meaning offline functionality only requires caching the application shell and assets - no complex data synchronization is needed.

### Problem Statement

We need to configure the application as a PWA with:

1. A web app manifest for installation metadata
2. Service worker for offline asset caching
3. Icons in multiple sizes for iOS and Android
4. iOS-specific meta tags for proper standalone app behavior
5. Automated build integration to generate PWA assets

The solution must integrate cleanly with our existing Vite build system and support the worktree-based development workflow.

## Decision

We will use **vite-plugin-pwa** with Workbox to implement PWA functionality. This plugin:

- Auto-generates the web app manifest from configuration
- Creates and registers a service worker using Workbox
- Supports multiple caching strategies
- Integrates seamlessly with Vite's build process
- Provides auto-update functionality for deployed apps

### Implementation Details

**1. Manifest Configuration**

The manifest is defined in `vite.config.ts` with the following settings:

```typescript
{
  name: 'BroteinBuddy',
  short_name: 'BroteinBuddy',
  description: 'Track your protein shake inventory by flavor and location with weighted random selection',
  theme_color: '#4F46E5',        // Indigo-600 from design system
  background_color: '#FFFFFF',
  display: 'standalone',          // Full-screen without browser UI
  orientation: 'portrait',        // Lock to portrait for mobile
  scope: '/',
  start_url: '/',
  icons: [/* 192x192 and 512x512 in regular and maskable variants */]
}
```

**2. Service Worker Strategy**

Using Workbox's `generateSW` mode with:

- **Cache strategy:** Precache all assets during installation
- **Runtime caching:** CacheFirst for external resources (fonts)
- **Auto-update:** Service worker updates automatically on new deployments
- **Asset patterns:** `**/*.{js,css,html,svg,png,ico,txt,woff2}`

**3. Icon Generation**

Icons are created as SVG source files:

- `icon-512.svg` - Main app icon with protein shaker bottle design
- `favicon.svg` - Simplified favicon for browser tabs

The plugin expects PNG icons in the manifest, which can be:

- Generated manually from SVG using design tools
- Created using `pwa-asset-generator` CLI tool
- Referenced as SVG for browsers that support it

**4. iOS-Specific Configuration**

Added meta tags in `index.html`:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="BroteinBuddy" />
<link rel="apple-touch-icon" href="/icon-512.svg" />
<meta name="theme-color" content="#4F46E5" />
```

**5. Worktree Compatibility**

The PWA configuration works seamlessly with worktree-specific ports:

- Service worker scope is set to `/` (root)
- Start URL is relative to domain, not port
- Each worktree can test PWA functionality independently

## Consequences

### Positive

**Offline Functionality**

- App works without internet connection after first load
- All assets cached locally for fast subsequent loads
- LocalStorage persists data across sessions

**Native App Experience**

- Installs to iOS home screen with custom icon
- Launches in standalone mode (no Safari chrome)
- Status bar styled to match app theme
- Portrait orientation locked for consistent UX

**Developer Experience**

- Simple configuration in vite.config.ts
- Automatic manifest generation
- Service worker updates handled automatically
- No manual cache management required

**Performance**

- Assets cached on first visit
- Subsequent visits load from cache (faster)
- Workbox provides optimized caching strategies

**Deployment**

- Vercel already configured with service worker headers
- Plugin integrates with build process
- No additional deployment steps needed

### Negative

**Build Complexity**

- Adds ~20KB dependency (vite-plugin-pwa)
- Service worker debugging can be challenging
- Cache invalidation requires careful version management

**Icon Management**

- Need to maintain icons in multiple formats (SVG + PNG)
- Maskable icons require careful design to avoid cropping
- Manual PNG generation adds a step if not automated

**iOS Limitations**

- No push notifications support on iOS
- No background sync on iOS
- Service worker restricted to Safari's implementation
- Must manually clear cache if corrupted (no UI for users)

**Cache Management**

- Old service workers can persist if update fails
- Users may see stale content if cache isn't cleared
- Need to test across service worker lifecycle states

### Neutral

**Service Worker Lifecycle**

- Service worker registers on first visit
- Updates automatically on new deployments
- Requires page refresh to activate new version
- Users may need to close all tabs for clean update

**Browser Compatibility**

- Works on all modern browsers
- iOS Safari 11.3+ required
- Gracefully degrades to standard web app if unsupported

**Development Workflow**

- Service worker disabled in dev mode (Vite serves directly)
- Must run `npm run build && npm run preview` to test PWA features
- Lighthouse audits require production build

## Alternatives Considered

### Alternative 1: Manual Service Worker Implementation

Create service worker manually with Workbox CLI or plain JavaScript.

**Why not chosen:**

- More boilerplate code to maintain
- Manual manifest creation prone to errors
- No integration with Vite build process
- More complex update mechanism
- Higher learning curve for new developers

**Trade-off:** More control but significantly more work.

### Alternative 2: Workbox CLI

Use Workbox CLI separate from Vite plugin.

**Why not chosen:**

- Requires separate build step
- No manifest generation
- Less integrated with Vite ecosystem
- Must manually configure asset paths
- Icon generation still manual

**Trade-off:** More flexibility but less convenience.

### Alternative 3: next-pwa (for Next.js)

Considered before choosing Svelte, but irrelevant after tech stack decision.

**Why not chosen:**

- Wrong framework (we chose Svelte in ADR-001)
- Locked into Next.js ecosystem

**Trade-off:** N/A - not compatible with our stack.

### Alternative 4: No PWA (Standard Web App)

Ship as a standard responsive web app without PWA features.

**Why not chosen:**

- Loses offline capability (major UX degradation)
- No home screen installation (less accessible)
- Browser chrome reduces screen space
- No app-like experience
- Misses a key differentiator from competitors

**Trade-off:** Simpler implementation but worse UX and missing core feature.

### Alternative 5: Native Mobile App

Build separate native iOS app using Swift/SwiftUI or React Native.

**Why not chosen:**

- Requires maintaining two codebases (web + mobile)
- Higher development cost and time
- Need to learn new framework
- App Store submission and review process
- LocalStorage would need reimplementation

**Trade-off:** Better native integration but 5-10x more work.

## References

- [ADR-001: Technology Stack Selection](./001-technology-stack-selection.md) - Initial PWA decision
- [ADR-003: LocalStorage Strategy](./003-localstorage-strategy.md) - Offline data persistence
- [ADR-005: Design System](./005-design-system.md) - Theme colors and design tokens
- [vite-plugin-pwa Documentation](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Apple: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Web App Manifest Specification](https://w3c.github.io/manifest/)
