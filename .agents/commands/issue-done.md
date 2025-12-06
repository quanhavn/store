# Complete Current Issue

Finalize the current issue I'm working on:

1. Run `bd list --status in_progress` to find the active issue
2. Run any relevant checks: `pnpm type-check && pnpm lint`
3. If checks pass, update the issue: `bd update <issue-id> --status done`
4. Show completion summary with `bd show <issue-id>`
5. Ask if I want to commit and merge the feature branch

This ensures code quality before marking issues complete.
