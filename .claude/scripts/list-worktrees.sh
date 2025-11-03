#!/bin/bash
# List all worktrees with their status and context
# Usage: ./list-worktrees.sh

set -e

echo "🌳 Git Worktrees for WallQu"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

MAIN_REPO=$(git rev-parse --show-toplevel)
WORKTREE_COUNT=0

git worktree list | while read -r worktree branch commit; do
    WORKTREE_COUNT=$((WORKTREE_COUNT + 1))

    # Extract branch name from [branch] format
    BRANCH_NAME=$(echo $branch | sed 's/\[//g' | sed 's/\]//g')

    echo "📂 Worktree #$WORKTREE_COUNT"
    echo "   Path: $worktree"
    echo "   Branch: $BRANCH_NAME"
    echo "   Commit: $commit"

    # Check if TASK.md exists
    if [ -f "$worktree/TASK.md" ]; then
        echo "   📝 Task file: ✅"
        # Show first line of task description
        TASK_DESC=$(grep -A 1 "## Description" "$worktree/TASK.md" | tail -1)
        if [ ! -z "$TASK_DESC" ]; then
            echo "   Task: $TASK_DESC"
        fi
    else
        echo "   📝 Task file: ❌"
    fi

    # Check if there are uncommitted changes
    cd "$worktree"
    if ! git diff-index --quiet HEAD 2>/dev/null; then
        echo "   Status: 🔧 Has uncommitted changes"
    else
        echo "   Status: ✅ Clean working tree"
    fi

    # Check if branch is merged
    if git branch --merged main | grep -q "^\s*${BRANCH_NAME}$" 2>/dev/null; then
        echo "   Merged: ✅ Merged to main"
    else
        echo "   Merged: ⏳ Not merged"
    fi

    cd - > /dev/null
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Quick commands:"
echo "  Create worktree: ./.claude/scripts/create-worktree.sh <branch-name>"
echo "  Clean up merged: ./.claude/scripts/cleanup-worktrees.sh"
echo "  Open in VS Code: code <worktree-path>"
