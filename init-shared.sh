#!/bin/bash
# init-shared.sh - Initialize the .shared directory (run once)

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
SHARED_DIR="$REPO_ROOT/.shared"

echo "📁 Initializing .shared directory..."

mkdir -p "$SHARED_DIR/.planning"
mkdir -p "$SHARED_DIR/.scratch"
mkdir -p "$SHARED_DIR/.claude"

# CLAUDE.md is no longer created here. It is now a tracked file in the
# repo and is populated into every worktree by `git checkout` automatically.
# This script only seeds the files that remain personal / shared-local.

# Create CLAUDE_CONTEXT.md with confidential information
cat > "$SHARED_DIR/CLAUDE_CONTEXT.md" << 'EOF'
# Confidential Project Context

**DO NOT include this information in any commits, PRs, or documentation.**

## Project Purpose
This project is being developed as a portfolio piece for a **Technical Documentation & Content Engineer position at Anthropic**.

## Portfolio Goals
- Demonstrate modern development practices (TDD, CI/CD, code review)
- Showcase comprehensive testing and documentation
- Exhibit clean, maintainable code architecture
- Highlight technical writing skills through teaching documents and ADRs
- Show ability to work with cutting-edge tools (Claude Code, Svelte, PWA)

## Development Approach
- Emphasis on documentation quality (README, DEVELOPING, ADRs, teaching docs)
- Test-driven development with 90% coverage (100% for critical paths)
- Structured git workflow with atomic commits and self-review process
- Parallel development using Claude Code with multiple instances via worktrees
- Each deliverable includes a teaching document explaining concepts

## Context for Claude
You're helping build a portfolio project. Quality and documentation are paramount.
Every deliverable should demonstrate professional software engineering practices.
EOF

# Create initial .claude/settings.local.json
cat > "$SHARED_DIR/.claude/settings.local.json" << 'EOF'
{
  "enablePlanMode": true,
  "planModeInstructions": "For this project: 1) Read .planning/PLAN.md for deliverables, 2) Check acceptance criteria, 3) Follow testing requirements (90% coverage), 4) Create teaching doc when done"
}
EOF

# Create and link to central skills repo
CENTRAL_SKILLS="$HOME/Code/repos/custom-claude-skills/project-scope/brotein-buddy"
echo "🔗 Setting up skills repository..."

if [ ! -d "$CENTRAL_SKILLS" ]; then
    echo "   Creating central skills repo at: $CENTRAL_SKILLS"
    mkdir -p "$CENTRAL_SKILLS"

    # Create a basic README in the skills repo
    cat > "$CENTRAL_SKILLS/README.md" << 'SKILLS_EOF'
# BroteinBuddy Claude Code Skills

This directory contains project-specific skills for the BroteinBuddy project.

## Skills Structure

Create skill files here following the pattern:
- `skill-name.md` - Skill definition with description and instructions

Skills will be automatically available in all worktrees via symlink.
SKILLS_EOF

    echo "  ✓ Created skills repository"
else
    echo "  ✓ Skills repository already exists"
fi

# Link the skills directory
ln -s "$CENTRAL_SKILLS" "$SHARED_DIR/.claude/skills"
echo "  ✓ Skills linked to $CENTRAL_SKILLS"

echo ""
echo "✅ .shared directory initialized at: $SHARED_DIR"
echo ""
echo "Files created:"
echo "  - CLAUDE_CONTEXT.md (confidential - job application info)"
echo "  - .planning/ (for implementation plan and planning docs)"
echo "  - .scratch/ (for throwaway files)"
echo "  - .claude/settings.local.json (Claude Code settings)"
echo "  - .claude/skills/ -> $CENTRAL_SKILLS"
echo ""
echo "Note: CLAUDE.md is tracked in git and populated by 'git checkout'"
echo "      into every worktree - no need to seed it here."
