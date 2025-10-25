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

### Testing Requirements

- **90% coverage** overall (enforced by CI)
- **100% coverage** for critical paths:
  - Random selection algorithm
  - Box priority sorting
  - Inventory mutations
  - LocalStorage operations

Run tests:
```bash
npm test              # Unit + integration tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # Coverage report
```

### Code Quality

- **ESLint + Prettier** configured with pre-commit hooks
- **TypeScript strict mode** enabled
- **No warnings** allowed in production builds

```bash
npm run lint          # Run ESLint
npm run format        # Format with Prettier
```

## Architecture

### Tech Stack

- **Svelte + TypeScript**: UI framework and type safety
- **Vite**: Build tool and dev server
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **LocalStorage**: Data persistence (no backend needed)
- **PWA**: Installable app with offline support

### Data Model

Data model design decisions will be documented in a future ADR when Phase 1 begins.

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

### Documentation Philosophy

BroteinBuddy maintains comprehensive documentation across multiple formats, each serving a specific audience and purpose:

**User-Facing Documentation:**
- **README.md**: Installation instructions, basic usage, and feature overview for end users

**Developer Documentation:**
- **DEVELOPING.md**: This file - complete setup guide, development workflow, architecture overview, and troubleshooting
- **docs/adr/**: Architecture Decision Records documenting design decisions and their rationale
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

**When to write an ADR:**
- Selecting technologies or frameworks
- Choosing architectural patterns
- Making trade-offs between competing approaches
- Establishing conventions that affect multiple components
- Decisions that are difficult or expensive to reverse

**How to write an ADR:**
1. Copy `docs/adr/000-template.md` to `docs/adr/XXX-your-decision.md`
2. Fill in all sections thoroughly
3. Consider multiple alternatives and document why they weren't chosen
4. Include references to relevant resources
5. Commit the ADR with your related code changes

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
