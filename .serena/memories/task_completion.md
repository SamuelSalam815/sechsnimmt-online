# Task completion

1. `npm run format` — accept its changes, never revert them. If it changes files unrelated to the task, those go in a separate commit.
2. `npm run lint`
3. `npx tsc`
4. `npm test`

Git: commit only when the user asks; stage files by name; do not push unless asked. UI changes that were not seen in a browser must be reported as untested.
