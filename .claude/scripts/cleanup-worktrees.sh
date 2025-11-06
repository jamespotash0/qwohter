#!/bin/bash
# Clean up merged worktrees and their branches
# Usage: ./cleanup-worktrees.sh

set -e

echo "🧹 Cleaning up merged worktrees..."
echo ""

MAIN_REPO=$(git rev-parse --show-toplevel)
CLEANED_COUNT=0
SKIPPED_COUNT=0

# Get list of all worktrees except the main one
git worktree list --porcelain | grep -A 2 "^worktree" | while IFS= read -r line; do
    if [[ $line == worktree* ]]; then
        WORKTREE_PATH=$(echo $line | cut -d' ' -f2-)

        # Skip the main repository
        if [ "$WORKTREE_PATH" != "$MAIN_REPO" ]; then
            # Read the next two lines to get branch info
            read -r head_line
            read -r branch_line

            if [[ $branch_line == "branch "* ]]; then
                BRANCH_NAME=$(echo $branch_line | sed 's/branch refs\/heads\///')

                # Check if branch is merged into main
                if git branch --merged main | grep -q "^\s*${BRANCH_NAME}$"; then
                    echo "✅ Removing merged worktree: $WORKTREE_PATH"
                    echo "   Branch: $BRANCH_NAME"

                    git worktree remove "$WORKTREE_PATH" 2>/dev/null || {
                        echo "   ⚠️  Failed to remove worktree, trying with --force..."
                        git worktree remove --force "$WORKTREE_PATH"
                    }

                    git branch -d "$BRANCH_NAME" 2>/dev/null || {
                        echo "   ⚠️  Branch not fully merged, use -D to force delete"
                    }

                    CLEANED_COUNT=$((CLEANED_COUNT + 1))
                    echo ""
                else
                    echo "⏭️  Skipping unmerged worktree: $WORKTREE_PATH"
                    echo "   Branch: $BRANCH_NAME (not merged to main)"
                    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
                    echo ""
                fi
            fi
        fi
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  Cleaned: $CLEANED_COUNT worktrees"
echo "  Skipped: $SKIPPED_COUNT unmerged worktrees"
echo ""
echo "Current worktrees:"
git worktree list
