# Start Working on a Beads Issue

Run `bd list` to see all open issues, then ask me which issue I want to work on.

Once I select an issue:
1. Run `bd show <issue-id>` to get full details
2. Update the issue status: `bd update <issue-id> --status in_progress`
3. Create a git branch for the issue: `git checkout -b feature/<issue-id>-<short-description>`
4. Use the todo_write tool to plan out the implementation steps based on the issue description
5. Ask me to confirm the plan before starting implementation

This workflow ensures issues are tracked and code is organized by feature branches.
