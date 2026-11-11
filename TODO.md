# TODO

## Fix the git author on existing commits

The commits so far were made with the sandbox's default git identity
(`agent <agent@claude-sechsnimmtv2...docker.internal>`), because no git identity
was configured. They should be under the user's own name and email.

Do this before anything is pushed, because it rewrites every commit hash.

1. Ask the user which name and email to use. Do not guess them.
2. Confirm the repo has no remote with these commits on it (`git remote -v`).
3. Set the identity and rewrite the history:

   ```bash
   git config user.name "Their Name"
   git config user.email "their@email.example"
   git rebase -r --root --exec 'git commit --amend --no-edit --reset-author'
   ```

4. Check the result with `git log --format='%h %an <%ae> | %s'`.
5. Remove this item, along with the reminder in `CLAUDE.md`, and commit that.
