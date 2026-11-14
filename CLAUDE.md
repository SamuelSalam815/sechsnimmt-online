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

## Formatter

- Accept the changes that the formatter (`npm run format`) makes. Do not revert them.
- If the formatter changes files that are not related to the current work, commit those changes in a separate commit.
