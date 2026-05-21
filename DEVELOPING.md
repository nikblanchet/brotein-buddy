# Developer Guide

## Project Setup

This project uses **git worktrees** for parallel development with multiple Claude Code instances.

### Bootstrapping on a new machine

The repo uses a bare-repo + worktrees layout: `.bare/` is the canonical
repository, `.git` is a file pointer, and each worktree (including `main/`) is
a child of `BroteinBuddy/`. To set this up from scratch:

```bash
# 1. Create the parent container, then a bare clone inside it.
mkdir BroteinBuddy && cd BroteinBuddy
git clone --bare git@github.com:nikblanchet/brotein-buddy.git .bare

# 1b. Replace the --bare default fetch refspec (which maps heads/heads and
#     collides with worktree branches) with the normal-clone refspec, then
#     populate refs/remotes/origin/*. Without this, `git log origin/main`
#     silently lies — origin/main never advances even though fetches succeed.
git --git-dir=.bare config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
git --git-dir=.bare fetch origin

# 2. Tell git this directory is backed by .bare.
echo "gitdir: ./.bare" > .git

# 3. Extract init-shared.sh from the bare repo and run it.
#    Populates .shared/ AND .bare/info/exclude.
git --git-dir=.bare show HEAD:init-shared.sh | bash

# 4. Create the main worktree at the BroteinBuddy/ level.
git --git-dir=.bare worktree add main main

# 5. Seed main/'s symlinks to .shared/. These aren't tracked in git; new
#    worktrees created with setup-worktree.py get them automatically, but the
#    first main/ needs manual seeding. `ln -sfn` replaces an existing symlink
#    without following it, which is important because `main/.claude/` itself
#    must remain a real directory (see note below).
cd main
ln -sfn ../.shared/CLAUDE_CONTEXT.md CLAUDE_CONTEXT.md
ln -sfn ../.shared/.planning .planning
ln -sfn ../.shared/.scratch .scratch
mkdir -p .claude
ln -sfn ../../.shared/.claude/agents .claude/agents
ln -sfn ../../.shared/.claude/skills .claude/skills
ln -sfn ../../.shared/.claude/settings.local.json .claude/settings.local.json
```

> **Note for maintainers:** `main/.claude/` must be a real directory containing
> per-file symlinks, **not** a single symlink to `.shared/.claude/`. Replacing
> the directory with a symlink would cause the subsequent `ln -sfn` calls to
> write _through_ that symlink into `.shared/.claude/`, creating
> self-referential links inside the shared store and breaking every worktree.

> **Note:** `.claude/skills` resolves through `.shared/.claude/skills` to
> `~/Code/repos/custom-claude-skills/project-scope/brotein-buddy/`. That central
> skills repo is a separate per-machine concern; on a brand-new machine,
> populate it first (clone from your own dotfiles/skills source) or
> skill-backed features won't work.

### Migrating an existing clone

If you already had a clone before this cleanup landed, `git pull` will delete
four index entries (`.claude/.claude`, `.claude/agents`,
`.claude/settings.local.json`, `.claude/skills`). Those tracked symlinks had
broken target paths (`../../../.shared/...`, one level too high) and were
non-functional anyway, but their deletion removes them from your working tree
too. To re-seed any existing worktree with correct symlinks:

```bash
cd <worktree>          # e.g., cd main
mkdir -p .claude
ln -sfn ../../.shared/.claude/agents .claude/agents
ln -sfn ../../.shared/.claude/skills .claude/skills
ln -sfn ../../.shared/.claude/settings.local.json .claude/settings.local.json
```

New worktrees created via `setup-worktree.py` already produce these symlinks
with the correct two-level (`../../`) target paths, so this manual step is
only needed for worktrees that pre-date the cleanup.

If your clone was created before step 1b above was documented, `.bare/config`
likely has no fetch refspec under `[remote "origin"]` (or has the `--bare`
default `+refs/heads/*:refs/heads/*`), so `git fetch` populates objects but
never advances `refs/remotes/origin/*`. `git log origin/main` will silently
show stale commits even after a successful fetch. Patch the refspec once:

```bash
git --git-dir=<repo-root>/.bare config remote.origin.fetch \
    '+refs/heads/*:refs/remotes/origin/*'
git --git-dir=<repo-root>/.bare fetch origin
```

### Creating New Worktrees

From inside `main/`, use `setup-worktree.py` (it creates the branch, the
worktree directory at `BroteinBuddy/<dir-name>/`, all symlinks, and assigns a
unique dev port):

```bash
.claude/skills/git-github-workflow/scripts/setup-worktree.py \
    --source-worktree main --branch-name feature/random-selection --dir-name feature-random-selection

# Work in the new worktree
cd ../feature-random-selection
npm run dev
```

### Worktree Structure

```
BroteinBuddy/
├── .bare/                # bare git repository (canonical)
├── .git                  # file: gitdir: ./.bare
├── .shared/              # personal/scratch (not committed)
│   ├── CLAUDE_CONTEXT.md # confidential context
│   ├── .planning/        # planning documents
│   ├── .scratch/         # throwaway files
│   └── .claude/          # Claude Code per-clone state (settings, agents, skills)
├── main/                 # main branch worktree
└── <feature-x>/          # short-lived feature worktrees (deleted after merge)
```

**Why worktrees?** They enable multiple Claude Code instances to work on
different features simultaneously without conflicts.

## Development Workflow

### Git Workflow

- **Branch naming**: `feature/`, `bug/`, `test/`, `docs/`
- **Commits**: Many small commits as you work, not big commits after the fact
- **PRs**: Always open PRs, squash and merge to main
- **Non-trivial bugs**: Branch from feature branch, fix, squash merge back

### Testing Strategy

This project follows a comprehensive three-tier testing approach:

**1. Unit Tests** (`tests/unit/`)

- Pure logic and utility functions
- Algorithm implementations (random selection, box priority)
- No DOM or component dependencies
- Fast execution, high coverage

**2. Integration Tests** (`tests/integration/`)

- Svelte component testing with @testing-library/svelte
- User interaction simulation
- Component behavior and state management
- DOM assertions and accessibility checks

**3. End-to-End Tests** (`tests/e2e/`)

- Full application workflows with Playwright
- Mobile-first testing (iPhone 13 Pro viewport)
- Cross-browser compatibility
- User journey validation

#### Coverage Requirements

- **90% overall coverage** (enforced by CI)
- **100% coverage for critical paths:**
  - Random selection algorithm
  - Box priority sorting
  - Inventory mutations
  - LocalStorage operations

Run tests:

Coverage is measured using Vitest's v8 coverage provider and reported in text, JSON, and HTML formats.

#### First-Time Setup: Playwright Browsers

Before running E2E tests for the first time, install Playwright browsers:

```bash
npx playwright install
```

This downloads Chromium, WebKit, and Firefox browsers needed for testing. Only needs to be run once per machine.

#### Running Tests

```bash
# Unit and integration tests
npm test                  # Run all Vitest tests once
npm run test:unit         # Run only unit tests
npm run test:integration  # Run only integration tests
npm run test:watch        # Run tests in watch mode
npm run test:ui           # Launch Vitest UI
npm run test:coverage     # Generate coverage report

# End-to-end tests
npm run test:e2e          # Run Playwright tests
npm run test:e2e:ui       # Run Playwright with UI mode
```

#### Visual Regression Testing (Local Development Only)

BroteinBuddy uses Playwright screenshot assertions to detect visual regressions in UI components. This catches unintended styling changes, layout shifts, and rendering bugs across browsers.

> [!NOTE]
> Visual regression tests currently run **locally only** (not in CI) due to platform-specific font rendering differences between macOS and Linux. See "Platform Limitation" section below for details.

**What is visual regression testing?**

Visual regression tests capture screenshots of components in various states and compare them against baseline images. If pixels differ beyond a configured threshold, the test fails.

**Running visual regression tests:**

```bash
# Run all E2E tests (includes visual regression)
npm run test:e2e

# Run only button visual regression tests
npx playwright test button.spec.ts

# Run with UI mode to see screenshots side-by-side
npx playwright test button.spec.ts --ui
```

**When snapshots fail:**

When a visual test fails, Playwright generates comparison artifacts:

```
tests/e2e/
  button.spec.ts-snapshots/          # Baseline snapshots (committed)
    button-variants-Desktop-Chrome-darwin.png
    button-variants-Mobile-Safari-darwin.png
    ...
  __diff_output__/                   # Diff images (not committed)
    button-variants-Desktop-Chrome-diff.png
    button-variants-Desktop-Chrome-actual.png
```

**How to review diffs:**

1. Look at the test output to see which snapshots failed
2. Check `__diff_output__/` for visual diffs (highlighted in red)
3. Compare actual screenshots against baseline snapshots
4. Determine if the difference is:
   - **Intentional** (design update) → update baselines
   - **Unintentional** (regression) → fix the CSS/component

**Updating baseline snapshots:**

If visual changes are intentional (e.g., design system update):

```bash
# Update all baseline snapshots
npx playwright test button.spec.ts --update-snapshots

# Review the new snapshots before committing
ls tests/e2e/button.spec.ts-snapshots/

# Commit updated baselines
git add tests/e2e/button.spec.ts-snapshots/
git commit -m "Update button visual regression baselines for design update"
```

**Snapshot tolerance:**

Minor anti-aliasing differences between test runs are allowed via `maxDiffPixels: 100` threshold in `playwright.config.ts`. This prevents flaky tests from sub-pixel rendering differences while still catching real regressions.

**Browser coverage:**

Visual regression tests run on:

- **Desktop Chrome**: Full coverage including hover states
- **Mobile Safari (iPhone 13 Pro)**: Touch-optimized rendering validation

Hover state tests automatically skip on Mobile Safari since mobile devices don't have hover interactions.

**Component Demo page:**

Visit `/#/component-demo` during development to interactively review component states before running visual regression tests. This page displays all component variants, sizes, and states.

**Platform Limitation:**

Visual regression tests currently skip in CI environments due to platform-specific font rendering differences. macOS and Linux render text at different widths (e.g., buttons render 404px wide on macOS vs 395px on Linux), causing snapshots to fail even though the visual appearance is functionally identical.

The tests work perfectly during local development with platform-specific baselines (`*-darwin.png`). This provides immediate value for catching regressions during development while we work on cross-platform support via Docker-generated Linux baselines.

#### Writing Tests

**Unit Test Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '$lib/utils';

describe('myFunction', () => {
  it('handles edge cases', () => {
    expect(myFunction('')).toBe('');
  });
});
```

**Integration Test Example:**

```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MyComponent from '$lib/components/MyComponent.svelte';

describe('MyComponent', () => {
  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(MyComponent);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

**E2E Test Example:**

```typescript
import { test, expect } from '@playwright/test';

test('completes user flow', async ({ page }) => {
  await page.goto('/');
  await page.click('button[data-testid="action"]');
  await expect(page.locator('.result')).toBeVisible();
});
```

#### Test Organization

- **Co-locate test utilities**: Shared test helpers go in `tests/helpers/`
- **Mirror source structure**: Integration tests should mirror `src/` structure
- **Descriptive names**: Use `.test.ts` for Vitest, `.spec.ts` for Playwright
- **Test data**: Use factories for complex test data (future)

### Re-enabling Skipped E2E Tests

**IMPORTANT**: Some E2E tests are marked with `test.skip()` because they test features not yet implemented. These tests MUST be re-enabled when implementing related features.

#### Before Implementing Any Feature

1. **Search for related skipped tests**:

   ```bash
   grep -rn "test.skip" tests/e2e/
   ```

2. **Check specific feature keywords**:

   ```bash
   grep -rn "test.skip.*your-feature-name" tests/e2e/
   ```

#### When Implementing a Feature

1. Find all skipped tests related to your feature
2. Read the skip comments to understand what they test
3. Remove `.skip` to enable the test:

   ```typescript
   // Before:
   test.skip('handles error case', async ({ page, context }) => {

   // After:
   test('handles error case', async ({ page, context }) => {
   ```

4. Ensure enabled tests pass before marking feature complete
5. Never ship a feature with its tests still skipped

#### Skipped Test Categories (as of PR #55)

- **Random Flow Error Handling** (3 tests): No flavors, all excluded, no stock
- **Confirmation Screen Details** (5 tests): Strict mode violations, alternative boxes
- **Empty States** (1 test): Inventory with no boxes
- **Placeholder Screens** (2 tests): "Coming soon" status styling
- **Browser Navigation** (3 tests): Back/forward through /random without state
- **Routing Navigation** (3 tests): Inventory to home, requires proper state setup

**Files with skipped tests:**

- `tests/e2e/random-flow.spec.ts` (11 skipped)
- `tests/e2e/routing.spec.ts` (8 skipped)
- `tests/e2e/inventory.spec.ts` (1 skipped)

### Code Quality

Automated code quality enforcement ensures consistent style and catches errors early.

**Tools:**

- **ESLint**: Code quality and bug detection for TypeScript and Svelte
- **Prettier**: Consistent code formatting across all file types
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run linters only on staged files for fast commits

**Commands:**

```bash
npm run lint          # Run ESLint on all files
npm run lint:fix      # Run ESLint and auto-fix issues
npm run format        # Format all files with Prettier
npm run format:check  # Check formatting without modifying files
```

**Pre-commit Hook:**

Every commit automatically runs:

1. ESLint with auto-fix on staged JS/TS/Svelte files
2. Prettier on all staged files
3. Only staged files are checked (fast!)

**Editor Setup:**

VS Code settings are included in the repository (`.vscode/settings.json`):

- Format on save enabled
- ESLint auto-fix on save
- Prettier as default formatter

Install recommended extensions when prompted, or run:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension svelte.svelte-vscode
```

**Configuration:**

- ESLint: `eslint.config.js` (flat config format)
- Prettier: `.prettierrc`
- lint-staged: `package.json` → `lint-staged` field
- Pre-commit hook: `.husky/pre-commit`

**Requirements:**

- **TypeScript strict mode** enabled
- **No ESLint warnings** allowed in production builds
- **All code must be formatted** before commit (enforced by pre-commit hook)

**Emoji Usage Policy:**

This project follows a strict emoji usage policy to maintain professional code and clear distinction between developer-facing and user-facing content.

**PROHIBITED** (Developer-Facing Content):

- Code comments and documentation strings
- Commit messages
- Pull request titles and descriptions
- Issue titles and descriptions
- Developer documentation (README, DEVELOPING, ADRs, teaching docs)
- CLI/terminal output (even if user-facing)
- Git history and developer communications

**ALLOWED** (User-Facing UI Only):

- Button labels in Svelte components (e.g., "🎲 Random Pick")
- User-visible text in web application interfaces
- Toast notifications and user alerts
- Any text rendered in variable-width fonts for end users

**Rationale:**

- Emoji in developer-facing content signals "AI-generated code that wasn't reviewed"
- Professional tone is critical for code review, collaboration, and maintainability
- User-facing emoji enhances UX and provides visual hierarchy
- Clear guidelines prevent inconsistency across contributors

**Examples:**

```typescript
// WRONG: Emoji in code comments
// Add the user's favorite flavor  ✅

// RIGHT: No emoji in code comments
// Add the user's favorite flavor
```

```svelte
<!-- RIGHT: Emoji in user-facing UI -->
<Button>🎲 Random Pick</Button>
```

```bash
# WRONG: Emoji in commit messages
git commit -m "Add random selection feature ✨"

# RIGHT: No emoji in commit messages
git commit -m "Add random selection feature"
```

For complete guidelines, see the `development-standards` skill.

### Automatic Dependency Management

BroteinBuddy uses git hooks to automatically keep dependencies synchronized when package files change. This prevents stale dependency issues in worktree-based workflows.

#### How It Works

When you pull or merge changes that modify `package.json` or `package-lock.json`, git hooks automatically run `npm install` to update your `node_modules`.

Two hooks work together to provide comprehensive coverage:

1. **post-merge**: Runs after `git merge` completes
2. **post-checkout**: Runs after `git checkout`, `git switch`, and during `git pull`

The post-checkout hook is particularly important because it catches **fast-forward pulls** (the most common scenario), which don't trigger post-merge.

#### What You'll See

When dependencies change, you'll see output like this:

```
[post-checkout] 14:23:45 - Detected dependency changes
[post-checkout] 14:23:45 - Running npm install...

added 5 packages, and audited 322 packages in 2s

[post-checkout] 14:23:47 - Dependencies updated successfully
[post-checkout] 14:23:47 - Updating git hooks...
[post-checkout] 14:23:48 - Git hooks updated
```

#### Activity Logging

All hook activity is logged to `.git/hooks.log` with timestamps:

```bash
# View recent hook activity
tail -20 $(git rev-parse --git-dir)/hooks.log
```

The log includes:

- When hooks triggered
- Whether package changes were detected
- npm install success/failure status
- Hook errors and warnings

Log files automatically rotate when they exceed 1MB (old log saved as `hooks.log.old`).

#### Quiet Mode

If you prefer less verbose output, set the `GIT_QUIET` environment variable:

```bash
# Single operation
GIT_QUIET=1 git pull

# Set permanently in shell config
export GIT_QUIET=1
```

In quiet mode, you'll only see minimal notifications:

```
[post-checkout] Updating dependencies...
[post-checkout] Dependencies updated
```

#### Disabling Hooks Temporarily

If you need to skip automatic dependency installation:

**Option 1: Skip all hooks**

```bash
git pull --no-verify
git merge --no-verify
```

**Option 2: Temporarily disable specific hook**

```bash
# Disable
mv .husky/post-checkout .husky/post-checkout.disabled

# Re-enable
mv .husky/post-checkout.disabled .husky/post-checkout
```

#### Manual Dependency Installation

If a hook fails or you need to install manually:

```bash
npm install          # Install dependencies
npm run prepare      # Re-initialize git hooks
```

#### Troubleshooting

**Hook didn't run after pulling changes:**

1. Check if package.json actually changed: `git log -1 --stat`
2. Verify hooks are executable: `ls -la .husky/post-*`
3. Check hook log for errors: `cat $(git rev-parse --git-dir)/hooks.log`
4. Manually run hook to test: `.husky/post-checkout HEAD HEAD 1`

**npm install fails during hook:**

- Hook exits gracefully (doesn't block git operation)
- Check the warning message and hook log
- Run `npm install` manually
- Common causes: network issues, corrupted package-lock.json

**Dependencies seem stale:**

1. Check when node_modules was last updated: `ls -ld node_modules`
2. Check recent hook activity in log file
3. Run `npm install` manually
4. Verify .husky/post-checkout exists and is executable

**Hook runs too frequently:**

- post-checkout runs on every branch switch (by design)
- Only installs when package files actually changed
- Use quiet mode to reduce output

#### Technical Details

**Hook Locations:**

- Shared logic: `.husky/check-dependencies.sh`
- Post-merge: `.husky/post-merge`
- Post-checkout: `.husky/post-checkout`

**Detection Method:**

- post-merge: Compares `ORIG_HEAD` to `HEAD`
- post-checkout: Compares previous ref to new ref

**Safety:**

- Hooks always exit 0 (never block git operations)
- npm install failures are logged and displayed
- User can continue working even if install fails

**Testing:**

- 15 comprehensive test cases in `tests/unit/hooks-dependency.test.ts`
- Tests cover: change detection, logging, quiet mode, error handling
- Run with: `npm test`

## Claude Code Skills and Agents

This project uses custom skills and agents to enhance Claude Code's capabilities with project-specific knowledge and workflows.

### Skills

Skills provide context and instructions that guide Claude Code's behavior. They are symlinked from `~/Code/repos/custom-claude-skills/` to `.shared/.claude/skills/`.

**Global Skills** (available in all projects):

Several global skills (development standards, exhaustive testing, dependency management, CLI UX, deprecation handling, and more) live in `~/Code/repos/custom-claude-skills/global-scope/` and apply across all projects. They are personal to the maintainer's machine setup and drift independently of this repo; consult that directory for the current list.

**Project-Specific Skills** (BroteinBuddy only):

- **git-github-workflow**: Worktree-based workflow, branch naming (setup/, feature/, bug/), commit standards, PR creation with gh CLI, testing requirements, squash-merge strategy. **MUST BE USED for all git/GitHub operations.**
- **brotein-buddy-standards**: Testing requirements (90% coverage, 100% critical paths), code quality tooling (ESLint, Prettier, Husky), documentation structure (README, DEVELOPING, ADRs, teaching docs), tech stack conventions

### Agents

Agents are autonomous workers that can use tools to complete complex tasks. They are symlinked from `~/Code/repos/custom-claude-agents/` to `.shared/.claude/agents/`.

**Project-Specific Agents**:

- **code-reviewer**: Comprehensive PR reviews across 11 dimensions. Use IMMEDIATELY AFTER writing code or before creating PRs.
- **teaching-mentor**: Creates patient, detailed teaching documents explaining design decisions and trade-offs. Use PROACTIVELY after completing deliverables.

### When to Use Each

**Use git-github-workflow skill when:**

- Creating new worktrees for parallel development
- Starting work on features, bugs, or setup tasks
- Committing code changes
- Creating pull requests
- Managing branches

**Use brotein-buddy-standards skill when:**

- Setting up testing for new features
- Configuring code quality tools
- Writing documentation
- Ensuring consistency with project standards

**Use code-reviewer agent when:**

- You've completed writing or modifying code
- Before creating pull requests
- When requested to perform code reviews

**Use teaching-mentor agent when:**

- You've completed a deliverable or feature
- After implementing significant architectural decisions
- When creating educational documentation

### Skill and Agent Locations

Skills and agents are stored externally and symlinked to avoid git conflicts:

```
~/Code/repos/custom-claude-skills/
├── global-scope/              # Available in all projects
│   ├── development-standards/
│   ├── exhaustive-testing/
│   └── ...
└── project-scope/
    └── brotein-buddy/         # BroteinBuddy-specific
        ├── git-github-workflow/
        └── brotein-buddy-standards/

~/Code/repos/custom-claude-agents/
└── project-scope/
    ├── code-reviewer.md
    └── teaching-mentor.md

.shared/.claude/
├── skills/                     # Symlinks to skills
│   ├── git-github-workflow -> ~/Code/.../git-github-workflow
│   └── brotein-buddy-standards -> ~/Code/.../brotein-buddy-standards
└── agents/                     # Symlinks to agents
    ├── code-reviewer.md -> ~/Code/.../code-reviewer.md
    └── teaching-mentor.md -> ~/Code/.../teaching-mentor.md
```

All worktrees automatically have access to these skills and agents via symlinks.

## Architecture

### Tech Stack

- **Svelte 5 (runes mode) + TypeScript**: UI framework and type safety
- **Vite (with PWA plugin)**: Build tool, dev server, and installable PWA
- **Vitest**: Unit and integration testing (with `@testing-library/svelte`)
- **Playwright**: End-to-end testing
- **LocalStorage**: Offline persistence — every device works fully without a network
- **Supabase (Postgres + Auth)**: Multi-device sync via passwordless magic-link sign-in; the app degrades gracefully to local-only when Supabase env vars are absent
- **Vercel**: Production deployment

### Data Model

The BroteinBuddy data model uses TypeScript interfaces to define the structure of the application's domain. All type definitions are located in `src/types/models.ts` with comprehensive JSDoc documentation.

**Core types:**

- **`Location`**: 2D coordinate system for physical storage (stack, height)
- **`Flavor`**: Protein shake flavor with ID, name, and random selection preference
- **`Box`**: Physical box containing bottles of a single flavor, with quantity and location
- **`AppState`**: Root state object containing all boxes, flavors, and settings

**Key design decisions:**

- Normalized structure: Boxes reference flavors by ID (not embedded)
- Runtime type guards for validating data loaded from LocalStorage
- Simple coordinate system: stack (horizontal) and height (vertical)
- All types serialize cleanly to JSON for LocalStorage persistence

**See:**

- [src/types/models.ts](src/types/models.ts) - Full type definitions with JSDoc
- [ADR-002: Data Model Design](docs/adr/002-data-model-design.md) - Design rationale and alternatives considered
- [tests/unit/models.test.ts](tests/unit/models.test.ts) - Comprehensive type guard tests (100% coverage)

### Storage Layer

The storage layer provides persistence for application state using browser localStorage. All storage operations are isolated in a dedicated abstraction layer that handles validation, error recovery, and schema migrations.

**Core functions:**

- **`loadState()`**: Retrieves application state from localStorage with validation. Never fails - returns default state on any error.
- **`saveState(state)`**: Persists application state to localStorage with pre-save validation. Throws on invalid state or quota exceeded.
- **`clearState()`**: Removes all stored data (for testing and reset functionality).

**Key design decisions:**

- localStorage chosen over IndexedDB for simplicity (data size < 10KB)
- Type guards used for validation (no external dependencies like Zod)
- Graceful error handling: corrupted data returns default state, never crashes
- Migration framework in place for future schema evolution
- Storage operations are synchronous (acceptable for small data size)

**Error handling philosophy:**

- **Expected errors** (missing data, corrupted JSON) → log warning, return default state
- **Quota exceeded** → throw exception for UI to handle
- **Invalid state on save** → throw error (programming bug)
- Never lose user data due to storage failures

**See:**

- [src/lib/storage.ts](src/lib/storage.ts) - Storage abstraction implementation
- [ADR-003: LocalStorage Strategy](docs/adr/003-localstorage-strategy.md) - Why localStorage, validation approach, migration strategy
- [tests/unit/storage.test.ts](tests/unit/storage.test.ts) - Comprehensive storage tests (100% coverage)
- [docs/teaching/1.2-web-storage-best-practices.md](docs/teaching/1.2-web-storage-best-practices.md) - Deep dive on web storage patterns

### Component Library

The BroteinBuddy UI is built on a custom design system with reusable components. All components use CSS variables (design tokens) for consistency and maintainability.

**Core components:**

- **Button**: Versatile button with 4 variants (primary, secondary, danger, ghost) and 3 sizes (sm, base, lg)
- **Modal**: Accessible dialog with animations, focus management, and configurable close behavior
- **NumberPad**: Touch-friendly number entry (1-12 grid) with 44px minimum touch targets

**Design tokens** (`src/styles/variables.css`):

- Colors (primary, semantic, surfaces, text, borders)
- Typography (font sizes, weights, line heights)
- Spacing (4px grid system)
- Border radius, shadows, transitions
- Z-index layers for overlays
- Touch target minimums (44px per iOS HIG)

**Component demo:** Run `npm run dev` to see interactive examples of all components with various configurations.

**See:**

- [docs/components.md](docs/components.md) - Complete component API documentation with examples
- [ADR-005: Design System](docs/adr/005-design-system.md) - Design decisions (CSS variables vs Tailwind, color palette, accessibility standards)
- [src/lib/ComponentDemo.svelte](src/lib/ComponentDemo.svelte) - Interactive component showcase
- [src/styles/variables.css](src/styles/variables.css) - All design tokens
- [src/styles/utilities.css](src/styles/utilities.css) - Common utility classes

### Client-Side Routing

BroteinBuddy uses **svelte-spa-router** for client-side navigation with hash-based routing. The routing infrastructure was established in task 2.2 to enable parallel development of screen components without App.svelte conflicts.

**Core routing files:**

- **`src/lib/router/routes.ts`**: Route definitions and type-safe navigation helpers
- **`src/routes/`**: Route component implementations (one component per route)
- **`src/App.svelte`**: Simple routing container that delegates to Router

**Route structure:**

```
/ → Home (main navigation)
/random → Random flavor selection
/random/confirm → Selection confirmation
/inventory → Inventory management
/inventory/:boxId/edit → Individual box editing
/inventory/rearrange → Drag-and-drop rearrangement
* → 404 Not Found
```

**Type-safe navigation:**

Instead of hardcoding route strings, use the `ROUTES` constants for compile-time safety:

```typescript
import { push } from 'svelte-spa-router';
import { ROUTES } from '$lib/router/routes';

// Navigate to inventory
push(ROUTES.INVENTORY);

// Navigate to box edit with parameter
push(ROUTES.INVENTORY_BOX_EDIT('box-123'));
```

**Key design decisions:**

- **Hash-based URLs** (`/#/inventory`) - zero server configuration needed for static PWA deployment
- **Placeholder pattern** - task 2.2 created minimal placeholders for all routes, enabling tasks 2.3-2.7 to implement them in parallel
- **svelte-spa-router** chosen over alternatives (tinro, SvelteKit) for simplicity and PWA compatibility
- All routes configured upfront to avoid App.svelte merge conflicts during parallel development

**URL format examples:**

- `https://broteinbuddy.app/#/` - Home
- `https://broteinbuddy.app/#/inventory` - Inventory screen
- `https://broteinbuddy.app/#/inventory/box-abc-123/edit` - Edit specific box

**See:**

- [src/lib/router/routes.ts](src/lib/router/routes.ts) - Route configuration and ROUTES constants
- [ADR-006: Routing Strategy](docs/adr/006-routing-strategy.md) - Why hash routing, library comparison, placeholder pattern rationale
- [tests/unit/router/routes.test.ts](tests/unit/router/routes.test.ts) - Route configuration tests (18 tests, 100% coverage)
- [tests/e2e/routing.spec.ts](tests/e2e/routing.spec.ts) - Comprehensive routing E2E tests (26 tests covering navigation, deep linking, 404 handling)

### State Management

The application state is managed using Svelte stores with automatic LocalStorage synchronization. All state operations are centralized in `src/lib/stores.ts`.

**Core store:**

- **`appState`**: Writable store containing the full AppState (boxes, flavors, settings)
- **Auto-save**: Every state mutation automatically persists to LocalStorage
- **Initialization**: `loadStateFromStorage()` loads persisted state on app startup

**State mutation functions:**

- `addBox(box)`, `removeBox(boxId)`, `updateBoxQuantity()`, `updateBoxLocation()`
- `addFlavor(flavor)`, `updateFlavor()`, `removeFlavor()`
- `setFavoriteFlavor(flavorId)`

**Key design decisions:**

- Svelte stores provide reactive state updates throughout the component tree
- Immutable updates with spread operators prevent accidental mutations
- Validation errors throw immediately (programming bugs)
- Storage errors log but don't crash (graceful degradation)
- No referential integrity validation (flexible initialization order)

**See:**

- [src/lib/stores.ts](src/lib/stores.ts) - Store implementation with 8 action functions
- [ADR-004: State Management Approach](docs/adr/004-state-management-approach.md) - Why Svelte stores, auto-save strategy, validation philosophy
- [tests/unit/stores.test.ts](tests/unit/stores.test.ts) - Comprehensive state management tests (51 tests, 100% coverage)
- [docs/teaching/1.5-svelte-stores-localstorage.md](docs/teaching/1.5-svelte-stores-localstorage.md) - Deep dive on reactive state and persistence

### Sync Layer

Optional multi-device sync backs local state up to Supabase. When the Supabase environment variables are absent the app runs exactly as before - local-only, no network - and the sync UI shows a "not configured" notice. Sign-in is passwordless (magic link).

**Core modules:**

- **`src/lib/supabase.ts`**: Supabase client singleton; `isSyncConfigured()` reports whether the env vars are present.
- **`src/lib/auth.ts`**: magic-link sign-in/out and the `session` store.
- **`src/lib/sync-coordinator.ts`**: the state machine wiring auth and `appState` mutations to debounced push, pull-on-start, realtime re-pull, and conflict resolution. Exposes `syncStatus`, `lastSyncedAt`, `pendingChanges`, and `pendingConflict` for the UI.
- **`src/lib/sync.ts`, `sync-meta.ts`, `realtime.ts`**: push/pull primitives, persistent sync metadata (the `dirty` bit), and the Supabase Realtime subscription.

**Sync UI:**

- **`SyncStatusBadge.svelte`**: a five-state status pill in the app-shell topbar, visible on every route when signed in. Its label/variant mapping is the pure `sync-status-badge-utils.ts`.
- **`SyncAccountModal.svelte`**: the Sync & Account sheet - a bottom sheet on phone, a right side panel on laptop (the same `.sheet` pattern as `AddInventoryPanel`). Opened from the More screen's Sync row and from the badge, both via the `syncSheetOpen` store in `src/lib/sync-ui-state.ts`.
- **`ConflictResolutionModal.svelte`**: a blocking centered modal, mounted globally in `App.svelte`, that asks the user to keep local vs. server data on a diverging sign-in.

**Key design decisions:**

- The sync coordinator subscribes to the existing `appState` store, so every screen's edits are tracked without per-screen wiring.
- Sync is strictly additive: with no Supabase env vars the feature degrades to a friendly notice, never an error.
- The sync UI uses the Cloud Dancer token system; the badge's synced / offline / error states are carried by the `--success` / `--info` / `--danger` semantic tokens.

**See:**

- [ADR-012: Supabase-Backed Sync](docs/adr/012-supabase-sync.md) and [ADR-013: Realtime Sync](docs/adr/013-realtime-sync.md) - sync design rationale
- [docs/teaching/1.7-supabase-magic-link-sync.md](docs/teaching/1.7-supabase-magic-link-sync.md) and [docs/teaching/1.8-realtime-and-offline-resilience.md](docs/teaching/1.8-realtime-and-offline-resilience.md) - deep dives
- [supabase/README.md](supabase/README.md) - backend setup steps

### Key Algorithms

- **Weighted random selection**: Picks flavors based on total quantity
- **Box priority**: Open > Unopened, Lower Qty > Higher, Higher Stack > Lower
- **Conflict resolution**: Handles location collisions when rearranging

## Documentation

### Documentation Philosophy

BroteinBuddy maintains comprehensive documentation across multiple formats, each serving a specific audience and purpose:

**User-Facing Documentation:**

- **README.md**: Installation instructions, basic usage, and feature overview for end users

**Developer Documentation:**

- **DEVELOPING.md**: This file - complete setup guide, development workflow, architecture overview, and troubleshooting
- **docs/adr/**: Architecture Decision Records documenting design decisions and their rationale
- **docs/api/**: API documentation (reserved for future use - intentionally deferred until Phase 1 when the application API exists)
- **docs/teaching/**: Educational write-ups, one per merged change, authored by the `teaching-mentor` subagent

**Project Planning:**

- **.planning/**: Implementation plan, task breakdown, and project management (in `.shared/`, not tracked)
- **CLAUDE.md**: Project context and standards for AI-assisted development (tracked at `main/CLAUDE.md`)

### Architecture Decision Records (ADRs)

We use ADRs to document significant architectural and design decisions. Each ADR captures:

- The context and forces influencing a decision
- The decision itself and why it was made
- Consequences (positive, negative, and neutral)
- Alternatives considered and why they were rejected

**ADR Index:**

- [ADR-000: Template](docs/adr/000-template.md) - Template for new ADRs
- [ADR-001: Technology Stack Selection](docs/adr/001-technology-stack-selection.md) - Svelte, TypeScript, LocalStorage, PWA
- [ADR-002: Data Model Design](docs/adr/002-data-model-design.md) - Normalized ID-based structure, type guards, location system
- [ADR-003: LocalStorage Strategy](docs/adr/003-localstorage-strategy.md) - Persistence approach, validation, and migration framework
- [ADR-004: State Management Approach](docs/adr/004-state-management-approach.md) - Svelte stores with LocalStorage auto-sync
- [ADR-005: Design System and Component Library](docs/adr/005-design-system.md) - Token system and component library foundations
- [ADR-006: Client-Side Routing Strategy](docs/adr/006-routing-strategy.md) - Hash-based routing via svelte-spa-router
- [ADR-007: Progressive Web App Implementation](docs/adr/007-pwa-implementation.md) - Service worker, manifest, and iOS install
- [ADR-008: Performance Optimization and Accessibility Implementation](docs/adr/008-performance-accessibility-optimization.md) - Bundle splitting and a11y baseline
- [ADR-009: Deployment Strategy and Production Launch](docs/adr/009-deployment-strategy.md) - Vercel deployment pipeline
- [ADR-010: Backup & Restore Feature Design](docs/adr/010-backup-restore-design.md) - In-app JSON backup and restore
- [ADR-011: Local Event Timeline](docs/adr/011-event-timeline.md) - Append-only event log underpinning sync
- [ADR-012: Supabase-Backed Sync with Magic-Link Auth](docs/adr/012-supabase-sync.md) - Multi-device sync architecture
- [ADR-013: Realtime Sync, Offline Resilience, and Burning Man](docs/adr/013-realtime-sync.md) - Realtime subscription + offline behavior
- [ADR-014: OKLCH Cloud Dancer Token System with Curated Flavor Palette](docs/adr/014-cloud-dancer-token-system.md) - 2026 UI refresh color system
- [ADR-015: Persistent Three-Tab Navigation with Pick as Default Route](docs/adr/015-persistent-tab-navigation.md) - 2026 UI navigation model
- [ADR-016: Phone-Friendly Rearrange UX](docs/adr/016-phone-rearrange-ux.md) - Scrollable rearrange surface for small viewports

**When to write an ADR:**

- Selecting technologies or frameworks
- Choosing architectural patterns
- Making trade-offs between competing approaches
- Establishing conventions that affect multiple components
- Decisions that are difficult or expensive to reverse

**How to write an ADR:**

1. Copy `docs/adr/000-template.md` to `docs/adr/XXX-your-decision.md`
   - Use zero-padded 3-digit sequential numbering: 001, 002, 003, etc.
   - Use descriptive kebab-case names: `002-data-model-design.md`
2. Fill in all sections thoroughly
3. Consider multiple alternatives and document why they weren't chosen
4. Include references to relevant resources
5. Commit the ADR with your related code changes
6. Add the new ADR to the index in this file

### Documentation Standards

- Write documentation as you write code, not as an afterthought
- Use clear, concise language with proper grammar
- Include code examples for non-trivial functionality
- Keep documentation up-to-date when code changes
- Link related documents together
- Follow the principles in the `development-standards` skill

## Deployment

Deployed automatically to Vercel:

- **Production**: Deployed on merge to `main`
- **Preview**: Deployed for every PR

Manual deployment:

```bash
npm run build
# Outputs to dist/
```

### Testing PWA Functionality

BroteinBuddy is a Progressive Web App (PWA) with offline support and iOS installation capabilities. PWA features are only active in production builds.

#### Local PWA Testing

Service workers and manifest files are generated during the build process:

```bash
# Build the production version
npm run build

# Run preview server to test PWA features
npm run preview
```

The preview server runs on http://localhost:4173/ and includes:

- Service worker registration
- Web app manifest (manifest.webmanifest)
- Offline asset caching
- Auto-update on reload

#### Testing PWA Installation (iOS)

On iOS devices (iPhone/iPad):

1. Open the preview URL or production URL in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Verify the app icon appears correctly
5. Launch the app from the home screen
6. Verify standalone mode (no Safari chrome)
7. Verify status bar styling (black-translucent)

#### Testing Offline Functionality

```bash
# Start preview server
npm run preview

# In browser DevTools:
# 1. Open Application tab (Chrome) or Storage tab (Firefox)
# 2. Navigate to Service Workers section
# 3. Verify service worker is registered and activated
# 4. Enable "Offline" mode in Network tab
# 5. Reload page - app should load from cache
# 6. Test core functionality (random selection, inventory)
```

#### PWA Audit with Lighthouse

Run Lighthouse to verify PWA compliance:

```bash
# Build production version
npm run build
npm run preview

# In Chrome DevTools:
# 1. Open Lighthouse tab
# 2. Select "Progressive Web App" category
# 3. Run audit

# Target scores:
# - Progressive Web App: 90+
# - Performance: 90+
# - Accessibility: 90+
```

#### Service Worker Debugging

Service workers cache assets for offline use. To clear cache during development:

**Chrome/Edge:**

1. DevTools → Application → Service Workers
2. Click "Unregister" next to the service worker
3. Application → Storage → Clear site data
4. Reload page

**Safari (iOS):**

1. Settings → Safari → Advanced → Website Data
2. Find localhost or your domain
3. Swipe left and delete
4. Close all Safari tabs

**Firefox:**

1. DevTools → Storage → Service Workers
2. Click "Unregister"
3. Storage → Cache Storage → Delete all
4. Reload page

#### Icon Generation

App icons are auto-generated from SVG sources:

- Source: `public/icon-512.svg` (master icon)
- Generated: PNG icons in multiple sizes (192x192, 512x512, etc.)
- Tool: `pwa-asset-generator` (dev dependency)

To regenerate icons after design changes:

```bash
npx pwa-asset-generator public/icon-512.svg public --icon-only --background transparent
```

See [ADR-007: PWA Implementation](docs/adr/007-pwa-implementation.md) for complete configuration details.

## Bundle Size Analysis

BroteinBuddy uses `rollup-plugin-visualizer` to generate interactive bundle size visualizations. This helps identify optimization opportunities and prevent unexpected bundle growth.

### When to Analyze Bundle Size

Run bundle analysis when:

- **Adding new dependencies** - Verify the size impact before merging
- **Before major releases** - Ensure bundle stays within performance budgets
- **Approaching bundle size budget** - Identify opportunities to reduce size
- **Investigating performance issues** - Find unexpectedly large dependencies or duplicates

### Generating Bundle Analysis

```bash
# Build production version (generates dist/stats.html automatically)
npm run build

# Open the bundle visualization
open dist/stats.html
```

The visualization opens in your browser showing an interactive treemap of your bundle.

### Interpreting stats.html

The visualization shows:

- **Treemap layout**: Each rectangle represents a file, sized proportionally to its contribution
- **Color coding**: Different colors represent different chunks (vendor, main, lazy-loaded)
- **File sizes**: Hover over rectangles to see actual, gzipped, and brotli sizes
- **Nested structure**: Drill down to see how imports contribute to file size

**What to look for:**

1. **Unexpectedly large dependencies** - Libraries that seem too big for their functionality
2. **Duplicate code** - Same library imported multiple times
3. **Lazy loading opportunities** - Large features that could be code-split
4. **Compression efficiency** - Compare gzip vs brotli ratios to identify poorly compressible files

### Bundle Size Budget

Current performance budgets (configured in `vite.config.ts`):

- **Initial load target**: < 250 KB total (actual: 91 KB)
- **Per-chunk warning threshold**: 250 KB
- **Critical path**: Main + vendor chunks only (lazy chunks don't block initial render)

**Current bundle breakdown:**

```
Main chunk:   49 KB (15 KB gzipped)  - Application code
Vendor chunk: 42 KB (16 KB gzipped)  - Svelte + router
DnD chunk:    32 KB (11 KB gzipped)  - Lazy-loaded drag-and-drop (rearrange screen only)
```

**When to take action:**

- Total initial bundle > 200 KB → investigate before hitting 250 KB limit
- Any chunk > 250 KB → consider code splitting
- Total initial bundle > 250 KB → requires optimization before merge

### Workflow Commands

```bash
# Full build and analysis workflow
npm run build && open dist/stats.html

# Check for oversized chunks quickly
ls -lh dist/assets/*.js

# Example output:
# 49K  main-abc123.js
# 42K  vendor-def456.js
# 32K  dnd-ghi789.js (lazy-loaded)
```

### Maintaining Performance Over Time

**Before adding dependencies:**

1. Check package size on [Bundlephobia](https://bundlephobia.com/)
2. Consider lighter alternatives
3. Run bundle analysis after installation
4. Document size impact in PR description

**When bundle grows unexpectedly:**

1. Run `npm run build && open dist/stats.html`
2. Identify the culprit in the treemap
3. Options to reduce size:
   - Use lighter alternative library
   - Lazy-load the feature
   - Tree-shake unused exports
   - Extract to separate chunk

**See also:**

- [ADR-008: Performance Optimization](docs/adr/008-performance-accessibility-optimization.md) - Bundle splitting strategy and performance budgets
- [vite.config.ts](vite.config.ts) - Build configuration and chunk size warnings

## Troubleshooting

### Symlinks not working

A worktree's `.claude/` symlinks (`agents`, `skills`, `settings.local.json`) can break if the worktree pre-dates the cleanup landed in PR #100 or if its symlinks were created with the wrong relative target. Re-seed from inside the worktree:

```bash
cd <worktree>          # e.g., cd main
mkdir -p .claude
ln -sfn ../../.shared/.claude/agents .claude/agents
ln -sfn ../../.shared/.claude/skills .claude/skills
ln -sfn ../../.shared/.claude/settings.local.json .claude/settings.local.json
```

See "Migrating an existing clone" earlier in this document for context on why this is sometimes needed. New worktrees created via `setup-worktree.py` already produce correct symlinks.

### Dependencies out of sync

```bash
# From any worktree
npm install
```

### Worktree cleanup

After a squash-merge, remove the worktree and delete the branch. The `git-github-workflow` skill owns the canonical cleanup recipe; the short form is:

```bash
# From the repo root (e.g., BroteinBuddy/)
git worktree remove <branch-dir>     # e.g., feature-random-selection
git branch -D <branch-name>          # e.g., feature/random-selection

# List remaining worktrees
git worktree list
```

## Resources

- [Svelte Documentation](https://svelte.dev/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
