# ADR-001: Technology Stack Selection

**Status:** Accepted

**Date:** 2025-10-25

**Deciders:** Development team

---

## Context

BroteinBuddy is a personal utility application for tracking protein shake inventory by flavor and location. The application needs to:

- Provide a mobile-first, touch-friendly interface
- Work offline without requiring a backend server
- Be installable on iOS devices as a Progressive Web App
- Support visual inventory management with drag-and-drop
- Persist data locally on the user's device
- Enable rapid development with strong type safety

### Background

This is a personal portfolio project demonstrating modern web development practices, including TDD, CI/CD, and comprehensive documentation. The application should showcase technical skills while solving a real personal need for inventory management.

### Problem Statement

We need to select a technology stack that:
- Enables rapid UI development with minimal boilerplate
- Provides strong type safety to catch errors early
- Supports PWA functionality for iOS installation
- Works entirely client-side without backend dependencies
- Allows comprehensive testing at unit, integration, and E2E levels
- Has modern tooling with fast build times and good developer experience

## Decision

We will use the following technology stack:

**Frontend Framework:** Svelte 5 + TypeScript
**Build Tool:** Vite
**Testing:**
- Vitest for unit and integration tests
- Playwright for end-to-end tests
- @testing-library/svelte for component testing
**Data Persistence:** LocalStorage
**Deployment:** Vercel with GitHub Actions CI/CD
**Progressive Web App:** PWA manifest + service worker (using Vite PWA plugin)

### Implementation Details

**Development Environment:**
- TypeScript strict mode enabled
- ESLint + Prettier for code quality
- Husky for pre-commit hooks (lint, format, test)
- Git worktrees for parallel development across multiple features

**Testing Strategy:**
- 90% overall code coverage requirement
- 100% coverage for critical paths (algorithms, storage, state mutations)
- Unit tests for pure logic
- Integration tests for component behavior
- E2E tests for complete user flows

**Deployment Pipeline:**
- GitHub Actions runs lint, type check, tests, and build on all PRs
- Vercel preview deployments for every PR
- Automatic production deployment on merge to main

## Consequences

### Positive

- **Svelte 5**: Minimal boilerplate, reactive by default, excellent performance, smaller bundle sizes than React/Vue
- **TypeScript**: Strong type safety catches errors at compile time, excellent IDE support, self-documenting code
- **Vite**: Near-instant dev server startup, fast HMR, optimized production builds
- **LocalStorage**: Zero backend infrastructure, works offline by default, simple data model
- **Vitest**: Fast test execution, similar API to Jest but built for Vite, excellent TypeScript support
- **Playwright**: Cross-browser E2E testing, reliable selectors, built-in retry logic
- **Vercel**: Zero-config deployments, automatic HTTPS, preview deployments for PRs
- **PWA**: Installable on iOS, works offline, feels native, no app store submission required

### Negative

- **Svelte 5**: Smaller ecosystem than React, fewer third-party components, newer runes system has limited tooling support (e.g., @testing-library/svelte compatibility issues)
- **LocalStorage**: Limited to ~5-10MB storage, no cross-device sync, manual data migration required, data loss if user clears browser data
- **No Backend**: Cannot implement server-side features (multi-user, cloud sync, backup)
- **PWA on iOS**: Limited compared to native apps (no background sync, push notifications have restrictions)
- **Git Worktrees**: Steeper learning curve for contributors unfamiliar with worktree workflow

### Neutral

- **Client-Only Architecture**: Appropriate for single-user personal utility but would require rearchitecture for multi-user features
- **Vercel Deployment**: Free tier sufficient for personal project but vendor lock-in if requirements change
- **Testing Coverage Requirements**: 90% overall, 100% critical paths requires discipline but ensures quality

## Alternatives Considered

### Alternative 1: React + TypeScript

**Description:** Use React 18 with TypeScript, create-react-app or Vite, React Testing Library

**Pros:**
- Larger ecosystem and community
- More third-party components available
- More familiar to potential employers/collaborators
- Better tooling support overall

**Cons:**
- More boilerplate code (hooks, useState, useEffect)
- Larger bundle sizes
- More complex reactivity model
- Performance overhead of virtual DOM

**Why not chosen:** Svelte's simpler syntax and better performance are more valuable for this project than React's ecosystem size. Portfolio projects should demonstrate cutting-edge technologies.

### Alternative 2: Vue 3 + TypeScript

**Description:** Use Vue 3 with Composition API and TypeScript, Vite, Vitest

**Pros:**
- Good balance between React and Svelte
- Excellent documentation
- Strong TypeScript support
- Good ecosystem

**Cons:**
- More boilerplate than Svelte
- Composition API learning curve
- Template syntax less elegant than Svelte
- Larger bundle sizes than Svelte

**Why not chosen:** Svelte provides better developer experience and performance while still offering excellent TypeScript support.

### Alternative 3: IndexedDB for Storage

**Description:** Use IndexedDB instead of LocalStorage for data persistence

**Pros:**
- Much larger storage capacity (hundreds of MB)
- Structured data with indexes
- Asynchronous API (non-blocking)
- Better for complex queries

**Cons:**
- More complex API
- Requires wrapper library (e.g., Dexie.js) for good DX
- Overkill for simple key-value storage
- More difficult to debug

**Why not chosen:** LocalStorage is sufficient for this application's data needs (small number of boxes and flavors). The simpler API reduces complexity. Storage can be migrated to IndexedDB later if needed.

### Alternative 4: Backend + Database (e.g., Supabase, Firebase)

**Description:** Add a backend service for data storage and sync

**Pros:**
- Cloud backup of data
- Cross-device synchronization
- Larger storage capacity
- Could add multi-user features

**Cons:**
- Increased complexity (authentication, API, data sync)
- Additional dependencies and potential costs
- Requires internet connection
- Longer initial load times
- Not needed for personal single-user app

**Why not chosen:** Backend adds unnecessary complexity for a personal utility. LocalStorage keeps the app simple, fast, and fully offline-capable.

### Alternative 5: Native Mobile App (React Native, Flutter)

**Description:** Build native mobile app instead of PWA

**Pros:**
- Better iOS integration
- Access to native APIs
- Better performance for complex operations
- App store distribution

**Cons:**
- Requires learning new framework
- More complex build and deployment
- App store approval process
- Cannot demonstrate web development skills
- Platform-specific code needed

**Why not chosen:** PWA approach demonstrates modern web capabilities and requires less platform-specific knowledge. Installability on iOS is sufficient for this use case.

## References

- [Svelte 5 Documentation](https://svelte.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [LocalStorage vs IndexedDB](https://web.dev/storage-for-the-web/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
