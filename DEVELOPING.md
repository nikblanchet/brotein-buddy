# Developer Guide

## Project Setup

This project uses **git worktrees** for parallel development with multiple Claude Code instances.

### First Time Setup

```bash
# Clone the repository
git clone git@github.com:nikblanchet/brotein-buddy.git
cd brotein-buddy

# Initialize shared directory structure
./init-shared.sh

# Create main worktree
./setup-worktree.sh main

# Start working
cd wt/main
npm run dev
```

### Creating New Worktrees

```bash
# Create a new feature branch worktree
./setup-worktree.sh feature/random-selection

# Work in the new worktree
cd wt/feature/random-selection
npm run dev
```

### Worktree Structure

```
BroteinBuddy/
├── wt/                       # All worktrees
│   ├── main/                # Main branch worktree
│   └── feature-*/           # Feature branch worktrees
├── .shared/                  # Shared files (not committed)
│   ├── CLAUDE.md            # Project context
│   ├── CLAUDE_CONTEXT.md    # Confidential info
│   ├── .planning/           # Planning documents
│   ├── .scratch/            # Throwaway files
│   └── .claude/             # Claude Code settings
├── src/                     # Source code
├── tests/                   # Test files
└── docs/                    # Documentation (ADRs, etc.)
```

**Why worktrees?** They enable multiple Claude Code instances to work on different features simultaneously without conflicts.

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

## Claude Code Skills and Agents

This project uses custom skills and agents to enhance Claude Code's capabilities with project-specific knowledge and workflows.

### Skills

Skills provide context and instructions that guide Claude Code's behavior. They are symlinked from `~/Code/repos/custom-claude-skills/` to `.shared/.claude/skills/`.

**Global Skills** (available in all projects):

- **development-standards**: No emoji in developer-facing content, modern language features, thorough documentation
- **exhaustive-testing**: Comprehensive test coverage across all test types
- **dependency-management**: Quality dependencies and package management
- **cli-ux-colorful**: Colorful CLI output design with ANSI colors
- **handle-deprecation-warnings**: Address deprecation warnings immediately

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

- **Svelte + TypeScript**: UI framework and type safety
- **Vite**: Build tool and dev server
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **LocalStorage**: Data persistence (no backend needed)
- **PWA**: Installable app with offline support

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
- **Teaching docs**: Educational documents explaining concepts and patterns (in `.planning/teaching/`)

**Project Planning:**

- **.planning/**: Implementation plan, task breakdown, and project management (in `.shared/`)
- **CLAUDE.md**: Project context and standards for AI-assisted development (in `.shared/`)

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

## Troubleshooting

### Symlinks not working

```bash
# Re-run setup for the worktree
cd ../..  # Go to repo root
./setup-worktree.sh <branch-name>
```

### Dependencies out of sync

```bash
# From any worktree
npm install
```

### Worktree cleanup

```bash
# Remove a worktree
git worktree remove wt/<branch-name>

# List all worktrees
git worktree list
```

## Resources

- [Svelte Documentation](https://svelte.dev/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
