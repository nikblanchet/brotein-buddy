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

See `docs/adr/002-data-model-design.md` for detailed architecture decisions.

**Core types:**

- `Flavor`: Represents a protein shake flavor
- `Box`: A physical box containing bottles of one flavor
- `Location`: (x: stack, y: height) coordinates
- `AppState`: Complete application state

### Key Algorithms

- **Weighted random selection**: Picks flavors based on total quantity
- **Box priority**: Open > Unopened, Lower Qty > Higher, Higher Stack > Lower
- **Conflict resolution**: Handles location collisions when rearranging

## Documentation

- **README.md**: User-facing documentation
- **DEVELOPING.md**: This file - developer setup and workflow
- **docs/adr/**: Architecture Decision Records (design decisions)
- **.planning/**: Implementation plan and planning documents (in `.shared/`)
- **Teaching docs**: Created with each deliverable (in `.planning/teaching/`)

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
