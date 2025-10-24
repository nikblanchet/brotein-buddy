#!/bin/bash
# setup-worktree.sh - Create a new worktree with shared files symlinked

set -e

if [ -z "$1" ]; then
    echo "Usage: ./setup-worktree.sh <branch-name>"
    echo ""
    echo "Examples:"
    echo "  ./setup-worktree.sh main"
    echo "  ./setup-worktree.sh feature/random-selection"
    echo "  ./setup-worktree.sh bug/123-fix-inventory"
    exit 1
fi

BRANCH=$1
REPO_ROOT="$(git rev-parse --show-toplevel)"
SHARED_DIR="$REPO_ROOT/.shared"
WT_DIR="$REPO_ROOT/wt/$BRANCH"

# Verify .shared exists
if [ ! -d "$SHARED_DIR" ]; then
    echo "❌ Error: .shared directory not found"
    echo "   Run ./init-shared.sh first"
    exit 1
fi

# Check if worktree already exists
if [ -d "$WT_DIR" ]; then
    echo "❌ Error: Worktree already exists at wt/$BRANCH"
    exit 1
fi

# Create the branch if it doesn't exist
if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo "📝 Branch '$BRANCH' doesn't exist, creating it..."
    git branch "$BRANCH"
fi

# Create worktree
echo "🌳 Creating worktree for branch: $BRANCH"
git worktree add "wt/$BRANCH" "$BRANCH" || {
    echo "❌ Failed to create worktree"
    exit 1
}

cd "$WT_DIR"

# Symlink shared files
echo "🔗 Symlinking shared files..."

ln -sf "../../.shared/CLAUDE.md" .
ln -sf "../../.shared/CLAUDE_CONTEXT.md" .
ln -sf "../../.shared/.planning" .
ln -sf "../../.shared/.scratch" .

# Create .claude directory with symlinks
mkdir -p .claude
ln -sf "../../../.shared/.claude/settings.local.json" .claude/
ln -sf "../../../.shared/.claude/skills" .claude/

# Install dependencies (package.json comes from git)
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Worktree created successfully: wt/$BRANCH"
echo ""
echo "Shared files symlinked:"
echo "  - CLAUDE.md (project context)"
echo "  - CLAUDE_CONTEXT.md (confidential info)"
echo "  - .planning/ (planning docs)"
echo "  - .scratch/ (throwaway files)"
echo "  - .claude/ (settings and skills)"
echo ""
echo "Next steps:"
echo "  cd wt/$BRANCH"
echo "  code .              # Open in VS Code"
echo "  npm run dev         # Start dev server"
echo "  claude              # Start Claude Code"
