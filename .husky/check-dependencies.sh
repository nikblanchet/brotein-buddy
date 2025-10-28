#!/bin/sh

# Shared script for checking and installing dependencies when package files change
# Called by: post-merge, post-checkout hooks
# Arguments:
#   $1: Hook name (for logging/output)
#   $2: Changed files list (newline-separated)

HOOK_NAME="$1"
CHANGED_FILES="$2"
GIT_DIR=$(git rev-parse --git-dir)
HOOK_LOG="$GIT_DIR/hooks.log"
QUIET_MODE=false

# Detect quiet mode from environment or git config
if [ -n "$GIT_QUIET" ] || [ "$GIT_TERMINAL_PROMPT" = "0" ]; then
  QUIET_MODE=true
fi

# Logging function - always logs regardless of quiet mode
log() {
  local message="$1"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$HOOK_NAME] $message" >> "$HOOK_LOG"

  # Rotate log if larger than 1MB
  if [ -f "$HOOK_LOG" ] && [ $(wc -c < "$HOOK_LOG") -gt 1048576 ]; then
    mv "$HOOK_LOG" "$HOOK_LOG.old"
    log "Log rotated (previous log saved as hooks.log.old)"
  fi
}

# Output function - respects quiet mode
output() {
  local message="$1"
  local timestamp=$(date '+%H:%M:%S')

  if [ "$QUIET_MODE" = "false" ]; then
    echo "[$HOOK_NAME] $timestamp - $message"
  fi
}

# Check if package files changed
check_package_changes() {
  if echo "$CHANGED_FILES" | grep -q "package.json\|package-lock.json"; then
    return 0  # Changes detected
  else
    return 1  # No changes
  fi
}

# Install dependencies
install_dependencies() {
  log "Detected changes to package files"
  log "Running npm install..."

  output "Detected dependency changes"
  output "Running npm install..."

  if [ "$QUIET_MODE" = "true" ]; then
    # Quiet mode: suppress npm output
    if npm install --loglevel=error > /dev/null 2>&1; then
      log "npm install succeeded"
      output "Dependencies updated"
      return 0
    else
      log "npm install FAILED"
      output "Warning: npm install failed"
      return 1
    fi
  else
    # Normal mode: show npm output
    echo ""  # Blank line for readability

    if npm install; then
      log "npm install succeeded"
      echo ""
      output "Dependencies updated successfully"
      return 0
    else
      log "npm install FAILED"
      echo ""
      output "Warning: npm install failed"
      output "You may need to run 'npm install' manually"
      return 1
    fi
  fi
}

# Re-initialize Husky hooks after npm install
prepare_hooks() {
  log "Running npm run prepare to update git hooks..."

  if [ "$QUIET_MODE" = "true" ]; then
    if npm run prepare --silent > /dev/null 2>&1; then
      log "npm run prepare succeeded"
      return 0
    else
      log "npm run prepare FAILED"
      return 1
    fi
  else
    output "Updating git hooks..."
    echo ""

    if npm run prepare; then
      log "npm run prepare succeeded"
      echo ""
      output "Git hooks updated"
      return 0
    else
      log "npm run prepare FAILED"
      echo ""
      output "Warning: Failed to update git hooks"
      output "Run 'npm run prepare' manually if needed"
      return 1
    fi
  fi
}

# Main execution
main() {
  log "Hook triggered"

  if check_package_changes; then
    log "Package changes detected"

    # Always show minimal notification, even in quiet mode
    if [ "$QUIET_MODE" = "true" ]; then
      echo "[$HOOK_NAME] Updating dependencies..."
    fi

    if install_dependencies; then
      # npm install succeeded, now update hooks
      prepare_hooks
      # Don't fail the git operation if prepare fails
    fi

    # Always exit 0 - don't block git operations on npm failures
    log "Hook completed"
    exit 0
  else
    log "No package changes detected, skipping npm install"
    exit 0
  fi
}

# Run main function
main
