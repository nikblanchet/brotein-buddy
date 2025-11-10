# ADR-009: Deployment Strategy and Production Launch

**Status:** Accepted
**Date:** 2025-11-09
**Deciders:** Development Team
**Tags:** deployment, vercel, production, infrastructure

## Context

Phase 3.5 of the implementation plan required deploying BroteinBuddy to production hosting. The application needed to be:

- Publicly accessible via HTTPS
- Installable as a Progressive Web App
- Automatically deployed from the main branch
- Cost-effective for a portfolio project
- Scalable for potential real-world usage

Key requirements:

- Zero-configuration deployment
- Automatic HTTPS with valid SSL certificates
- Preview deployments for pull requests
- Build caching for fast deployments
- Support for PWA service workers and manifest
- Node.js 22+ environment

## Decision

We deployed BroteinBuddy to Vercel with the following configuration:

### 1. Platform Selection: Vercel

**Decision:** Use Vercel as the hosting platform.

**Rationale:**

- Zero-configuration Vite support (auto-detected framework)
- Automatic HTTPS with SSL certificates
- Built-in preview deployments for all PRs
- Free tier suitable for portfolio projects
- Excellent performance (global CDN)
- GitHub integration for automatic deployments
- Native support for SPAs (single-page applications)

**Alternatives Considered:**

- Netlify: Similar features, chose Vercel for better Vite integration
- GitHub Pages: Lacks preview deployments and custom headers
- Railway/Render: Overkill for static site, higher cost
- AWS S3 + CloudFront: Too much manual configuration

### 2. Node.js Version Requirement

**Decision:** Require Node.js >= 22.0.0 via package.json engines field.

**Implementation:**

```json
{
  "engines": {
    "node": ">=22.0.0"
  }
}
```

**Rationale:**

- Ensures consistent build environment between local and production
- Matches development environment (Node 22.17.1)
- Rollup native binaries require specific Node version
- Prevents build failures from version mismatches

### 3. Rollup Linux Binary Fix

**Decision:** Add @rollup/rollup-linux-x64-gnu as explicit optional dependency.

**Problem:** Initial deployment failed with error:

```
Error: Cannot find module '@rollup/rollup-linux-x64-gnu'
```

**Root Cause:** npm's platform-specific optional dependency detection failed on Vercel's Linux build servers.

**Solution:**

```json
{
  "optionalDependencies": {
    "@rollup/rollup-linux-x64-gnu": "4.52.5"
  }
}
```

**Implementation Details:**

- Version 4.52.5 matches the Rollup version used by Vite 7.1.12
- Marked as optional to avoid installation errors on macOS/Windows development machines
- Updated vercel.json install command to use `npm install --include=optional`

**Rationale:**

- Forces npm to install the Linux-specific binary on Vercel's build environment
- Eliminates reliance on automatic platform detection
- No impact on local development (different platform binary used locally)

### 4. Deployment Configuration

**Decision:** Use vercel.json for explicit configuration.

**Configuration:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install --include=optional",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**Rationale:**

- SPA routing: All routes rewrite to index.html for client-side routing
- Service worker caching: Ensures SW updates on every deployment
- Security headers: Protects against common web vulnerabilities
- Explicit configuration: Prevents auto-detection issues

### 5. Deployment Workflow

**Decision:** Automatic deployment from main branch, preview deployments for PRs.

**Workflow:**

1. Pull request created → Vercel creates preview deployment
2. PR merged to main → Vercel deploys to production
3. All deployments run through GitHub Actions CI first (tests, linting, build)

**Production URL:** https://brotein-buddy.vercel.app

**Rationale:**

- Preview deployments enable testing before production
- Automatic production deployment reduces manual steps
- CI/CD ensures quality gates before deployment
- No manual deployment process to forget or misconfigure

## Consequences

### Positive

- Application is publicly accessible and installable as PWA
- HTTPS automatically configured with valid SSL certificate
- Zero-cost hosting for portfolio project
- Preview deployments enable thorough testing
- Deployment process is fully automated
- Build configuration is documented and reproducible

### Negative

- Vendor lock-in to Vercel (mitigated by standard Vite build process)
- Cold start times on free tier (acceptable for portfolio project)
- Rollup Linux binary workaround needed (one-time configuration)

### Neutral

- Custom domain optional (currently using brotein-buddy.vercel.app)
- Environment variables not needed (LocalStorage-only app)

## Known Issues and Phase 3.4 Plan

This deployment represents a **technical validation**, not a portfolio-ready release. Significant issues were discovered during production testing and documented in GitHub issues #73-#87:

**Critical Bugs (5):**

- #73: Drag-and-drop rearrange completely broken
- #74: Out-of-stock flavors cannot be edited or restocked
- #75: New flavors cannot have inventory added
- #76: Cannot add new boxes of existing flavors
- #77: PWA standalone mode has no navigation (relies on browser back button)

**Major UX Issues (5):**

- #78: No way to set or edit favorite flavor
- #79: Random selection screen needs UX redesign
- #80: No total bottle count per flavor visible
- #81: Cannot drag items to bottom of stack
- #82: Inventory screen does not wrap on narrow windows

**Visual/Polish Issues (5):**

- #87: Purple text on gray background (poor contrast)
- #83: Home screen button styling inconsistent
- #84: Overall visual design needs improvement
- #85: Unclear which flavors are excluded from random
- #86: Stack location indexing confusion (1 vs 0)

**Phase 3.4 Scope:**

Phase 3.4 (User Documentation & Polish) must address all critical bugs and major UX issues before the application is considered portfolio-ready. The current deployment serves to:

1. Validate that Vercel deployment works technically
2. Provide a live URL for integration testing
3. Enable dogfooding to discover additional issues

**Portfolio-Ready Criteria:**

- All critical bugs fixed (issues #73-#77)
- All major UX issues resolved (issues #78-#82)
- Visual polish completed (issues #83-#87)
- User documentation written
- Screenshots added to README
- Lighthouse scores verified on production (95+/95+/90+/85+)

## Notes

### E2E Test Gap Analysis

Many of the discovered issues should have been caught by E2E tests. Investigation revealed:

1. Drag-and-drop tests (#73) may be testing the wrong behavior
2. Inventory CRUD tests (#74, #75, #76) have gaps in coverage
3. PWA standalone navigation (#77) not tested (requires manual testing on device)
4. Some E2E tests were skipped during Phase 2/3 implementation (34 tests with `test.skip()`)

**Action Item:** Review and re-enable skipped E2E tests during Phase 3.4 implementation. See PLAN.md "Important: Skipped Tests for Future Features" section.

### Future Improvements

Potential enhancements for future consideration:

- Custom domain configuration
- Analytics integration (privacy-focused)
- Performance monitoring (Real User Monitoring)
- Automated Lighthouse CI in GitHub Actions
- Multiple deployment environments (staging, production)

## References

- Vercel Documentation: https://vercel.com/docs
- Vite Deployment Guide: https://vitejs.dev/guide/static-deploy.html
- ADR-007: PWA Implementation
- ADR-008: Performance Optimization and Accessibility
- PLAN.md Phase 3.5: Deployment & Launch
- GitHub Issues #73-#87: Production Issues
