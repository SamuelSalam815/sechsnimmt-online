# Project instructions

## Comments

- A comment states why the code is as it is, never what it does.
- A comment that re-describes the code has no value and goes stale. Leave it out.
- A comment that says what a thing is means the name is wrong. Fix the name instead.
- Put the why on the declaration that carries it, not on the code that uses it.
- Reasoning that several modules share belongs in `docs/`. State it there once.
  Do not point to that doc from each module: the pointer is noise and the doc
  stands on its own.
- Reference a doc for a rule or a decision that the reader needs at that line,
  for example `docs/game-rules.md` for a placement rule. Do not restate it.
- A module comments only on what it owns. It does not describe what another
  module does with its values.
- A comment earns its place for a reason or a rejected design, a workaround, a
  constant that comes from outside the code, or a consequence that the reader
  cannot see.
- Terminology that the code renames belongs in `docs/rule-clarifications.md`,
  not in a comment.

## Names

- A name carries every word that it needs to be clear away from its
  declaration. Write `logLevel`, not `level`, and `streamId`, not `id`.
- Do not shorten a word to save characters. Write `message`, not `msg`.
- Use one name for one concept. Look for synonyms of a concept, for example
  `subscription`, `connection` and `stream` for one event stream.
- Do not rename because you found synonyms. Ask the user why the names are
  different and which name is correct. If there is no reason to change, keep
  the name that the code uses most.

## Git

- Before deleting a branch, push, fetch, and confirm that the remote holds
  every commit of it, for example with `git branch -r --contains <tip>`. A push
  command that returned without an error is not proof.
- A refusal from a non-forcing command is that check doing its work. Sync the
  remote and run the same command again. Its success is the confirmation.
- Ask for confirmation before a forcing command, and before any forcing or
  deleting command that reaches a remote: `git branch -D`, `git push --force`,
  `git push --force-with-lease`, `git push --delete`. A go-ahead for the task,
  such as "delete both branches after the merge", covers the safe command only.
  Name the branch, say what the force overrides and what has no other copy.

## Formatter

- Accept the changes that the formatter (`npm run format`) makes. Do not revert them.
- If the formatter changes files that are not related to the current work, commit those changes in a separate commit.

## Open work

- `TODO.md` holds the open work and the open questions. Read it at the
  start of a task. Raise each entry that touches the task with the user
  before you start work on it.
