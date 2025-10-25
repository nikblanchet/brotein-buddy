# Deployment Guide

This document describes how to deploy BroteinBuddy to production using Vercel.

## Overview

BroteinBuddy uses a modern CI/CD pipeline with:

- **GitHub Actions** - Automated testing and quality checks on every PR
- **Vercel** - Hosting and deployment with preview environments

## Prerequisites

- GitHub repository with admin access
- Vercel account (free tier works fine)
- GitHub Actions enabled in repository

## Initial Vercel Setup

### 1. Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New..." → "Project"
3. Import your `brotein-buddy` repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click "Deploy"

### 2. Configure Environment Variables (if needed)

Currently, BroteinBuddy doesn't require environment variables, but if you add any in the future:

1. Go to Project Settings → Environment Variables
2. Add variables for Production, Preview, or Development environments
3. Redeploy for changes to take effect

### 3. Configure Deployment Settings

The `vercel.json` file in the repository configures:

- Build and output directories
- SPA routing (rewrites all routes to index.html)
- Security headers (XSS protection, frame options, etc.)
- Service worker caching

No additional Vercel dashboard configuration is needed.

## Deployment Workflows

### Production Deployment

**Trigger**: Push to `main` branch

**Process**:
1. GitHub Actions CI runs:
   - Linting
   - Type checking
   - Tests with coverage (90% threshold)
   - Build
2. If CI passes, changes are merged to main
3. Vercel automatically deploys to production
4. Production URL: Will be assigned by Vercel (add custom domain if desired)

### Preview Deployment

**Trigger**: Open or update a Pull Request

**Process**:
1. GitHub Actions CI runs on PR
2. Vercel creates a preview deployment
3. Preview URL is posted as a comment on the PR
4. Each commit to the PR updates the preview deployment

**Benefits**:
- Test changes in a production-like environment
- Share preview links for feedback
- Verify before merging

## CI/CD Pipeline

### GitHub Actions Workflow

File: `.github/workflows/ci.yml`

**Runs on**:
- Every push to `main`
- Every pull request to `main`

**Steps**:
1. Checkout code
2. Setup Node.js (v20 with npm caching)
3. Install dependencies
4. Run linter (`npm run lint`)
5. Check code formatting (`npm run format:check`)
6. Run type check (`npm run check`)
7. Run tests with coverage (`npm run test:coverage`)
   - Enforces 90% coverage threshold (configured in `vitest.config.ts`)
   - Fails if coverage is below threshold
8. Build project (`npm run build`)
9. Upload coverage to Codecov (optional)

**Quality Gates**:
- All tests must pass
- Code must be properly formatted
- No linting errors
- No type errors
- 90% test coverage minimum

## Monitoring and Status

### Status Badges

The README includes badges for:

- **CI Status**: Shows if latest build passed
- **Code Coverage**: Shows current test coverage percentage

### Vercel Dashboard

Monitor deployments at [vercel.com/dashboard](https://vercel.com/dashboard):

- Deployment history
- Build logs
- Performance analytics
- Domain configuration

## Troubleshooting

### Build Fails in Vercel

1. Check Vercel build logs for errors
2. Verify the build works locally: `npm run build`
3. Check that `vercel.json` matches your build configuration
4. Ensure all dependencies are in `package.json` (not just `devDependencies` if needed at build time)

### CI Workflow Fails

1. Check GitHub Actions logs for specific error
2. Run the failing command locally:
   - `npm run lint`
   - `npm run test:coverage`
   - `npm run build`
3. Fix issues and push changes
4. Workflow will re-run automatically

### Coverage Below Threshold

If tests fail due to coverage:

1. Run `npm run test:coverage` locally to see coverage report
2. Add tests for uncovered code
3. Coverage thresholds are in `vitest.config.ts`:
   - Lines: 90%
   - Functions: 90%
   - Branches: 90%
   - Statements: 90%

### Preview Deployment Not Working

1. Check that Vercel GitHub integration is installed
2. Verify Vercel bot has access to the repository
3. Check Vercel project settings → Git

## Custom Domain (Optional)

To add a custom domain:

1. Go to Vercel Project Settings → Domains
2. Add your domain
3. Configure DNS according to Vercel's instructions
4. Vercel automatically provisions SSL certificate

## Codecov Integration (Optional)

To enable coverage reporting:

1. Go to [codecov.io](https://codecov.io)
2. Sign in with GitHub
3. Add your repository
4. Copy the Codecov token
5. Add to GitHub repository secrets as `CODECOV_TOKEN`
6. Coverage will upload automatically on CI runs

## Rolling Back

If a bad deployment goes to production:

### Via Vercel Dashboard

1. Go to Deployments
2. Find the last known good deployment
3. Click "..." → "Promote to Production"

### Via Git

1. Revert the problematic commit
2. Push to main
3. New deployment will automatically trigger

## Best Practices

1. **Always create PRs** - Don't push directly to main
2. **Review preview deployments** - Check the preview URL before merging
3. **Monitor CI status** - Don't merge if CI is failing
4. **Test locally first** - Run tests and build before pushing
5. **Use semantic commits** - Clear commit messages help track changes
6. **Keep main stable** - Only merge working, tested code

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
