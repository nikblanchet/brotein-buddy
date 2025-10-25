# Contributing to BroteinBuddy

Thanks for your interest in contributing to or diving deep into BroteinBuddy!
This document outlines the development side of in this project. This is just
a silly little app that helps me keep track of my current Protein Shake
inventory and let fate (pseudorandom numbers) decide which flavor I drink.

## Repo Rules

1. Be nice.
2. Don't break main.
3. The only way to merge to main is via PR.
4. PRs must pass all tests before they can be merged.
5. PRs must be code reviewed before they can be merged.
6. Currently, PRs not opened by Nik must be approved by Nik.
7. PRs and branches should be specific to a single, demonstratable change.
8. All merges to main are squashed.
9. Code review comments should follow the below structure.
10. Try not to use colorful emoji. I'm looking at you, Claude.

### Code Review Comment Structure

```md
# Code Review: PR #x - nth review

<!-- The tl;dr. Use as few words as possible. Put in bold. -->

**Approved** / **Fix 2 things before merge** /
**Fix 1 thing before merge and 2 things immediately after** (like a
high-priority bug that must be addressed ASAP but that's out of scope for this
PR) / **Approved with immediate followup needed**

<!-- If needed, you may then add 8–128 words giving a summary of the code
     review. This is where you may put compliments, kudos, or praise. -->

## Findings

<!-- This is the table of contents and findings at-a-glance.
     - You don't have to use every category — hopefully you won't need to!
       Omit the categories you dont' need.
     - The valid categories are below. Sort them in the below order.
     - The categories (part before the colon) of the individual problems are
       not super official. We'll see how they evolve. Just make it clear.
     - Always link to the section headers. -->

* [Problems](#problems)
  - [Blockers](#blockers): <!-- Must fix before merge --> 3 <!-- # of -->
    - [Logic error: Random library implemented incorrectly](#section_link)
    - [Test coverage: Missing async validation test](#section_link)
    - [Bug: Infinite scroll breaks shuffle feature](#section_link)
  - [Important](#important): 1 <!-- Must fix immediately after merge. -->
    <!-- This happens when fixing it would cause scope creep in the PR. A
         common example is discovering a new, silent, existing problem when
         debugging a problem you caused.  -->
    <!-- Create issues for these. -->
    - [Documentation: Architecture diagram added in CLAUDE.md contradicts one in DEVELOPER.md](#section_link)
  - [Minor](#minor): 1 <!-- Problems that can be addressed later -->
    <!-- Create issues for these -->
    - [Consistency: Test of `this()` does not match established conventions](#section_link)
- [Enhancement ideas](#enhancement-ideas)
  1. [High impact, low effort](#high-impact-low-effort): 1
  - [Technical debt: `_foo()` logic duplicated](#section_link)
  2. [High impact, moderate effort](#high-impact-moderate-effort):
  3. [Moderate impact, low effort](#moderate-impact-low-effort):
  4. [High impact, high effort](#high-impact-high-effort):
  - [Test infrastructure: Switch to `BetterTester.js`](link_to_header)
  5. [Moderate impact, moderate effort](#moderate-impact-moderate-effort):
  6. [Low impact, low effort](#low-impact-low-effort):
  7. [Moderate impact, high effort](#moderate-impact-high-effort):
  8. [Low impact, moderate effort](#low-impact-moderate-effort):
* [Nit](#nit) <!-- Not problems. Small things that could improve code -->

## Problems

### Blockers

#### Logic error: Random library implemented incorectly

<!-- Here's where you go deep.
     - Be specific.
     - Include technical details.
     - Propose possible solutions. -->
```

## My Development Methodology

### Git Worktrees for Parallel Development

For this project, I'm using **git worktrees** to enable multiple Claude Code instances to work on different features simultaneously without conflicts.

**Structure:**

```
BroteinBuddy/
├── wt/                 # All worktrees
│   ├── main/           # Main branch worktree
│   │   └── symlinks    # Various .gitignored symlinks to ../../../.shared stuff
│   └── feature-*/      # Feature branch worktrees
│       └── symlinks    # Various .gitignored symlinks to ../../../.shared stuff
├── .shared/            # Files shared via .gitignored symlinks
│   └── symlink_targets # .gitignored files shared across all working trees
└── _root               # Placeholder branch at repo root
```

### Shared Configuration

The `.shared/` directory contains files that are symlinked into each worktree but never committed to git:

- **`CLAUDE.md`**: Project context and overview for Claude Code. On the fence
  about exluding this, but sometimes my buddy Claude leaks `CLAUDE_CONTEXT.md`
  info into it. (I forgive him!) If you're using Claude Code, you can create
  your own version with `/init`. As the program develops, it should be able
  to deduce enough to make yours as robust as mine.
- **`CLAUDE_CONTEXT.md`**: Confidential [mostly meta] information about the
  project. Things like what I'm trying to prove, what my motivation is, etc.
- **`.planning/`**: Implementation plans and planning documents. I'll give some
  examples in the `/docs/learning` folder and maybe later in this doc, but the
  full details aren't super necessary. It's also temporary. It gets me from 0
  to MVP. After that, I wing it or create separate plan docs for bigger
  features, refactors, whatevs.
- **`.scratch/`**: Throwaway files and experiments. Like if we need to write a
  script to help with debugging something, it goes here.
- **`.claude/`**: Just a folder. Not symlinked… but its contents are.
- **`.claude/settings.local.json`**: Claude Code settings
- **`.claude/skills`**: Just a folder for individual
  [Claude Code skills](docs.claude.com/en/docs/agents-and-tools/agent-skills/overview). Not symlinked… but it's contents are

This approach allows all worktrees to access the same context and configuration while keeping sensitive information out of the repository.

**Huh?**

On the off chance that you don't follow yet (I didn't always understand), the
situation is this. If I **didn't** use working trees, I'd just gitignore the
files and keep them in my main repo directory. That works because checking out
different branches swaps all the files **except** the gitnored ones. They just
hang out: they're available to any branch I happen to check out, right? Well,
working trees are a bit more complicated.

With working tree, each branch gets its very own, actual folder on your
machine. See the problem yet? No? I gotcha! If I have a gitignored file or
folder, let's use `CLAUDE.md`, in `BroteinBuddy/wt/main/`, Git ignores it. But
because it's ignored by Git, it's not going to show up in
`BroteinBuddy/wt/feature-branch/`. But I ~~might~~ will need it there, too!
I've got 2 options:

1. **Copy the files to every single feature branch.** This isn't so bad to
   start. I can automate this; however, ~~if~~ when Claude or I makes a change
   to the file, the folder will have a different version than the other folders.
   For something like `.scratch/`, that's not a huge deal, but for `CLAUDE.md`,
   yeah, that needs to be the same. So in this case, I not only have to create
   the files, I have to constantly keep them in sync. Yeah, I could automate
   this, too. But now I've got two scripts to maintain.
2. **Move the files out of the branches and replace them with symlinks.** In
   this approach, I still need to automate the creation of the symlinks, just
   like I do the actual files in the other scenario. But now, the files are
   automatically kept in sync.

Make sense?

There is a downside to this setup, and it effects both scenarios: race
conditions. When I have multiple instances of Claude Code running, they can
get confused if both of them are reading and editing the same file. I thought
about putting together a checkout system, but for now, I just supervise the
files myself with the `settings.local.json` configuration:

```json
{
  "additionalDirectories": ["//absolute/path/to/BroteinBuddy/.shared/"],
  "permissions": {
    "ask": ["Write(//absolute/path/to/BroteinBuddy/.shared/**)"]
  }
}
```

Maybe I'll revisit a checkout system if an when Claude Code can be more
dynamic with its to-do lists, e.g., "Ah, this file is busy. I'll keep trying
it in the background and move on to other things" or "I'll come back to this
later. Maybe it'll be free then." For now, I'll conduct the orchesstra myself.

**Creating a new worktree:**
You don't have to use worktrees — live your best dev life — but if you want to,
I created a script to automate the setup. It does all the symlink creation for
me because ~~I'm lazy~~ automation is good! You may need to tweak it for your
personal setup. I considered gitignoring it and putting it outside the repo,
but maybe you'll find it instructive? Just don't stage -> commit your changes
cuz I'll reject your PR. `\(^_^)/`

```bash
./setup-worktree.sh feature/your-feature-name
cd wt/feature/your-feature-name
```

See
[docs/teaching/0.1-git-worktrees-parallel-development.md](docs/teaching/0.1-git-worktrees-parallel-development.md)
for an in-depth explanation of this approach.

### Claude Code Skills & Subagents

For this project, I use [Claude Code](https://docs.anthropic.com/claude-code)
for development, and I use both global (user) and project-specific
[skills](https://docs.claude.com/en/docs/claude-code/skills) and
[subagents](https://docs.claude.com/en/docs/claude-code/sub-agents) to help
steer it.

I store the project-specific skills and agents outside of the project's
folders, and symlink them in.

**Skill & subagent file structure:**

```
~/.claude/
  ├── skills/ # Global/User skills
  │   ├── user-skill-1.md → {external-skills-repo}/user-skill-1.md
  │   └── user-skill-2.md → {external-skills-repo}/user-skill-2.md
  └── agents/ # Global/User Subagents
      ├── user-agent-1.md → {external-skills-repo}/user-agent-1.md
      └── user-agent-2.md → {external-skills-repo}/user-agent-2.md
wt/{branch}/.claude/
        ├── skills → ../../.shared/.claude/skills/ # Project skills
        └── agents → ../../.shared/.claude/agents/ # Project subagents
.shared/.claude/
        ├── skills/ (directory containing individual skill symlinks)
        │   ├── pjct-skill-1.md → {external-skills-repo}/pjct-skill-1.md
        │   └── pjct-skill-2.md → {external-skills-repo}/pjct-skill-2.md
        └── agents/
            ├── pjct-agent-1.md → {external-agents-folder}/pjct-agent-1.md
            └── pjct-agent-2.md → {external-agents-folder}/pjct-agent-2.md
```

Or, in words:

Instead of linking my `~/.claude/skills/` and `~/.claude/agents/` to an outside
folder filled with User Skills and Subagents, respectively, I add symlinks
inside those folders to the individual skills I want to enable. It's the same
idea for project-specific Skills and Subagents with one extra step. First,
I create a symlinks from inside each branch to the `.shared/.claude/skills/`
and `.shared/.claude/agents` folders. This allows all different branches to
point to the exact same folder. Then, I do the same thing I did with User
Skills and Subjents: I create add symlinks inside those folders to the
individual Skills and Subagents I want to enable.

It's a non-obvious choice, but creating individual symlinks one-by-one lets me:

1. Keep my mature and experimental Skills and Agents in one place
2. Turn a Skill or Agent on or off by creating or deleting a single symlink
3. Reuse project Skills across several projects
4. Publicly share my custom Skills (and, soon, Subagents) with others in
   [a separate GitHub repo](https://github.com/nikblanchet/claude-skills/)

Additional skill resources:

- [Anthropic's official example skills](https://github.com/anthropics/skills)
- [Anthropic's example skill-creator skill](https://github.com/anthropics/skills/tree/main/skill-creator) — it helps creates new skills
- [My custom skills](https://github.com/nikblanchet/claude-skills/)

### Task Breakdown

Development is organized into discrete deliverables with clear structure:

- **Acceptance Criteria** - Specific, testable requirements
- **In Scope** - What will be implemented in this deliverable
- **Out of Scope** - What explicitly won't be included
- **Dependencies** - Other deliverables that must complete first
- **Parallel Tracks** - Work that can proceed simultaneously

See `.planning/PLAN.md` (accessible via symlink in worktrees) for the full implementation plan.

### Git Workflow

- **Branch naming**: `feature/`, `bug/`, `test/`, `docs/`
- **Commits**: Many small, incremental commits as work progresses
- **Pull Requests**: Required for all changes; squash and merge to main
- **Reviews**: Code reviews are required

## Technology Stack

### Core Technologies

- **Svelte + TypeScript** - UI framework with type safety
- **Vite** - Build tool and dev server
- **LocalStorage** - Client-side data persistence (no backend)
- **PWA** - Progressive Web App for offline support and installation

### Testing

- **Vitest** - Unit and integration testing
- **Playwright** - End-to-end testing
- **@testing-library/svelte** - Component testing utilities

**Coverage requirements:**

- 90% overall coverage (enforced by CI)
- 100% coverage for critical paths (random selection, inventory mutations, etc.)

### Code Quality

- **ESLint** - Linting
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit checks
- **TypeScript strict mode** - Enhanced type checking

### Deployment

- **Vercel** - Hosting and CI/CD
  - Production: Auto-deploy on merge to main
  - Preview: Auto-deploy for every PR

## Getting Started

### First Time Setup

```bash
# Clone the repository
git clone git@github.com:nikblanchet/brotein-buddy.git
cd brotein-buddy

# Initialize shared directory
./init-shared.sh

# Create main worktree
./setup-worktree.sh main
cd wt/main

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Development Commands

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
npm test              # Run unit + integration tests
npm run test:e2e      # Run end-to-end tests
npm run test:coverage # Generate coverage report
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
```

## Documentation

- **README.md** - User-facing documentation
- **DEVELOPING.md** - Technical setup and architecture guide
- **CONTRIBUTING.md** - This file
- **docs/adr/** - Architecture Decision Records (design decisions)
- **docs/teaching/** - In-depth teaching documents created with each deliverable

## Questions or Issues?

Feel free to open an issue on GitHub or reach out via the repository discussions.
