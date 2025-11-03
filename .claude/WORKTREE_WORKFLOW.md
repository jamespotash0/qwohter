# Git Worktrees + Claude Code: Parallel Development Workflow

## Why Use Worktrees?

**The Problem**: Every time you switch branches, Claude Code loses context. You spend 10-15 minutes re-explaining your codebase.

**The Solution**: Git worktrees let you have multiple branches checked out simultaneously, each with its own Claude Code session maintaining full context.

## Benefits

- ⚡ **Zero Context Switching** - Each Claude session maintains deep understanding
- 🚀 **Parallel Development** - Work on multiple features simultaneously
- 🧠 **Preserved Knowledge** - Claude remembers your architecture in each worktree
- 🔒 **Complete Isolation** - No risk of wrong-branch commits
- 💡 **Faster Development** - No more git stash/unstash cycles

## Quick Start

### Create a New Worktree

```bash
# Create a worktree for a new feature
./.claude/scripts/create-worktree.sh feature/stripe-multi-env main

# Create a worktree for a bug fix based on current branch
./.claude/scripts/create-worktree.sh fix/paywall-bug feature/seat-based-pricing

# Create an experimental worktree
./.claude/scripts/create-worktree.sh experiment/new-billing-ui main
```

This will:
1. Create a new branch and worktree
2. Install npm dependencies
3. Copy environment files
4. Create TASK.md and context files
5. Ready for Claude Code!

### Open in VS Code

```bash
# Option 1: From the create script output
code ../wallqu-feature-stripe-multi-env

# Option 2: Navigate manually
cd ../wallqu-feature-stripe-multi-env
code .
```

### List All Worktrees

```bash
./.claude/scripts/list-worktrees.sh
```

Shows all worktrees with their status, branches, and whether they have uncommitted changes.

### Clean Up Merged Worktrees

```bash
./.claude/scripts/cleanup-worktrees.sh
```

Automatically removes worktrees for branches that have been merged to main.

## Practical Use Cases for WallQu

### 1. Parallel Feature Development

```bash
# Terminal 1: Working on Stripe webhooks
./.claude/scripts/create-worktree.sh feature/stripe-webhooks main
code ../wallqu-feature-stripe-webhooks
# Open Claude Code → "Implement Stripe webhook handling for multi-environment"

# Terminal 2: Working on grace period UI
./.claude/scripts/create-worktree.sh feature/grace-period-ui feature/seat-based-pricing
code ../wallqu-feature-grace-period-ui
# Open Claude Code → "Create UI components for grace period notifications"

# Terminal 3: Hot fix for production
./.claude/scripts/create-worktree.sh fix/subscription-validation main
code ../wallqu-fix-subscription-validation
# Open Claude Code → "Fix subscription validation bug in production"
```

Each Claude session maintains full context of your codebase without interference!

### 2. Safe Experimentation

```bash
# Test major changes without affecting your main work
./.claude/scripts/create-worktree.sh experiment/react-query-migration main

# If it works: merge it
# If it fails: just delete the directory - no git history pollution
```

### 3. Code Review Preparation

```bash
# Create a worktree to polish your feature before PR
./.claude/scripts/create-worktree.sh review/feature-prep feature/seat-based-pricing

# Ask Claude to:
# - Add comprehensive docstrings
# - Generate tests
# - Clean up code style
# - Add type hints
```

### 4. Dependency Testing

```bash
# Test dependency upgrades safely
./.claude/scripts/create-worktree.sh upgrade/react-19 main

cd ../wallqu-upgrade-react-19
npm install react@19 react-dom@19
# Test everything with Claude Code's help
```

### 5. Model Comparison

```bash
# Compare different Claude Code approaches
./.claude/scripts/create-worktree.sh experiment/approach-a main
./.claude/scripts/create-worktree.sh experiment/approach-b main

# Give both the same task and compare results
# Merge the better implementation
```

## Advanced Workflow

### Combining with Claude Code's Task Tool

In each worktree, you can use Claude Code's specialized agents:

```
"Use Explore agent to find all subscription validation logic"
"Use general-purpose agent to research Stripe webhook best practices"
```

### Parallel Development Strategy

**Strategy 1: Feature + Bug Fix**
```
Main work:    wallqu/ (feature/seat-based-pricing)
Bug fix:      wallqu-fix-urgent-bug/ (fix/org-deletion)
Experiments:  wallqu-experiment-ui/ (experiment/new-paywall)
```

**Strategy 2: Backend + Frontend**
```
Backend:      wallqu-api/ (feature/stripe-api)
Frontend:     wallqu-ui/ (feature/billing-ui)
Testing:      wallqu-e2e/ (feature/e2e-tests)
```

### Environment Variables

Each worktree shares the same Supabase project (same .env), so be careful with:
- Database changes (migrations affect all worktrees)
- Environment-specific settings

**Tip**: Use separate Supabase projects for experimentation:
```bash
# In experiment worktree
cp .env .env.backup
# Update VITE_SUPABASE_URL to test project
```

## Best Practices

### Naming Conventions

Use clear, descriptive names:

✅ **Good**:
- `feature/stripe-multi-env-webhooks`
- `fix/subscription-validation-bug`
- `experiment/react-query-migration`

❌ **Bad**:
- `test1`, `temp`, `backup`

### Task Files

Each worktree gets a `TASK.md` - use it!

```markdown
# Task: feature/stripe-webhooks

## Description
Implement Stripe webhook handling for multiple environments

## Success Criteria
- [ ] Webhook receives events in test mode
- [ ] Webhook receives events in production
- [ ] Environment-specific handling works
- [ ] Tests pass

## Notes
- Using Stripe CLI for local testing
- Branch deployments use test webhook endpoint
```

### Claude Code Context Files

Each worktree has `.claude/context.md` to help Claude maintain context:

```markdown
# Claude Code Context

## What I'm Working On
Implementing multi-environment Stripe webhook handling

## Key Files
- supabase/functions/stripe-webhook/index.ts
- src/services/stripeService.ts
- .env (environment configuration)

## Important Context
- Production uses live Stripe keys
- Branch deployments should use test keys
- Webhook endpoints are environment-specific
```

### Disk Space Management

Worktrees use minimal extra space (they share .git):
- Each worktree ≈ size of working files
- node_modules can be substantial

**Optimization**:
```bash
# Use pnpm for automatic dependency sharing
npm install -g pnpm
pnpm install  # Automatically deduplicates packages

# Or manually share node_modules (advanced)
ln -s ../../wallqu/node_modules ./node_modules
```

## Common Workflows

### Daily Development

```bash
# Morning: Check all worktrees
./.claude/scripts/list-worktrees.sh

# Create new worktree for today's feature
./.claude/scripts/create-worktree.sh feature/todays-work main

# Evening: Clean up merged work
./.claude/scripts/cleanup-worktrees.sh
```

### Emergency Hot Fix

```bash
# Don't interrupt your current work!
./.claude/scripts/create-worktree.sh fix/critical-bug main
code ../wallqu-fix-critical-bug

# Fix the bug, commit, push, merge
# Your original work in wallqu/ is untouched
```

### Feature Development + Code Review

```bash
# Main feature work
cd wallqu-feature-new-billing/

# PR feedback comes in - handle in separate worktree
./.claude/scripts/create-worktree.sh review/pr-123-feedback feature/new-billing
code ../wallqu-review-pr-123-feedback

# Address feedback without losing your main context
```

## Troubleshooting

### "Branch already checked out"

```bash
# List worktrees to find conflict
git worktree list

# Remove the conflicting worktree
git worktree remove /path/to/worktree
```

### Disk Space Issues

```bash
# Check worktree sizes
du -sh ../wallqu-*

# Remove unused worktrees
./.claude/scripts/cleanup-worktrees.sh

# Or manually remove
git worktree remove ../wallqu-old-feature
```

### Lost Worktree Location

```bash
# Find all worktrees
git worktree list

# Or use the list script
./.claude/scripts/list-worktrees.sh
```

### Sharing Dependencies

```bash
# Use pnpm for automatic sharing
pnpm install

# Or manual symlink (be careful!)
ln -s ../../wallqu/node_modules ./node_modules
```

## Integration with Your Current Work

### For Your Stripe Issue

Create parallel worktrees to solve the multi-environment problem:

```bash
# Worktree 1: Research and implementation
./.claude/scripts/create-worktree.sh feature/stripe-multi-env main
# Claude Code: "Research Stripe multi-environment webhook strategies"

# Worktree 2: Continue current feature work
# (Your existing wallqu/ directory on feature/seat-based-pricing)

# Worktree 3: Test the solution
./.claude/scripts/create-worktree.sh test/stripe-webhooks feature/stripe-multi-env
# Claude Code: "Set up Stripe CLI and test webhook forwarding"
```

### For Future Development

```bash
# Backend changes
./.claude/scripts/create-worktree.sh feature/api-updates main

# Frontend changes
./.claude/scripts/create-worktree.sh feature/ui-updates main

# Testing
./.claude/scripts/create-worktree.sh feature/test-coverage main
```

## Summary

Git worktrees + Claude Code = **Development Velocity Multiplier**

- No more context switching overhead
- Parallel development streams
- Full Claude Code context preservation
- Complete isolation between tasks
- Faster iteration and experimentation

Start with 2-3 worktrees and expand as needed. Your development speed will increase dramatically once you get used to the workflow!

## Quick Reference

```bash
# Create
./.claude/scripts/create-worktree.sh <branch-name> [base]

# List
./.claude/scripts/list-worktrees.sh

# Clean
./.claude/scripts/cleanup-worktrees.sh

# Open
code ../wallqu-<branch-name>
```

Happy parallel developing! 🚀
