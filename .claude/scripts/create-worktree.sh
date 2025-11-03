#!/bin/bash
# Create a new git worktree with automated setup
# Usage: ./create-worktree.sh <branch-name> [base-branch]

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <branch-name> [base-branch]"
    echo ""
    echo "Examples:"
    echo "  $0 feature/stripe-webhooks main"
    echo "  $0 fix/subscription-bug feature/seat-based-pricing"
    echo "  $0 experiment/new-ui main"
    exit 1
fi

BRANCH_NAME=$1
BASE_BRANCH=${2:-main}
REPO_NAME="wallqu"
WORKTREE_PATH="../${REPO_NAME}-${BRANCH_NAME//\//-}"

echo "🌳 Creating worktree..."
echo "  Branch: $BRANCH_NAME"
echo "  Base: $BASE_BRANCH"
echo "  Path: $WORKTREE_PATH"

# Create worktree
git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_BRANCH"

# Setup environment
cd "$WORKTREE_PATH"

echo ""
echo "📦 Installing dependencies..."
npm install

# Copy environment files
echo ""
echo "🔐 Copying environment files..."
cp ../${REPO_NAME}-feature-seat-based-pricing/.env .env 2>/dev/null || echo "No .env to copy"

# Create task file
echo ""
echo "📝 Creating TASK.md..."
cat > TASK.md << EOF
# Task: $BRANCH_NAME

## Description
[Add your task description here]

## Related Files
-

## Success Criteria
- [ ]
- [ ]

## Testing Plan
- [ ]

## Notes
- Created: $(date)
- Base branch: $BASE_BRANCH
EOF

# Create a .claude directory for this worktree's context
mkdir -p .claude
cat > .claude/context.md << EOF
# Claude Code Context for $BRANCH_NAME

## Branch Purpose
[Describe what this branch is for]

## Key Files
-

## Current Status
- [ ] In progress
- [ ] Ready for review
- [ ] Merged

## Important Notes
-
EOF

echo ""
echo "✅ Worktree created successfully!"
echo ""
echo "📂 Location: $WORKTREE_PATH"
echo "🎯 Task file: TASK.md"
echo "🧠 Context file: .claude/context.md"
echo ""
echo "Next steps:"
echo "  1. cd $WORKTREE_PATH"
echo "  2. code ."
echo "  3. Open Claude Code and start working!"
echo ""
echo "To open in VS Code now: code $WORKTREE_PATH"
