# Conventions

## Code

- Biome style: single quotes, semicolons, trailing commas, 2 spaces, width 80.
- Simple explicit code over abstractions; smallest change.
- Enums for phases and request types; `import type` for types.
- Selectors return `undefined` when not found; reducers wrap them in `requireFound`.
- Comments state what code cannot: reasons, rejected designs, workarounds, external constants. Short declarative sentences (STE style), often "X. Y therefore Z."

## Tests

- Unit tests cover pure code only. No mocks of external dependencies. Impure code (random, clock, network) is tested as integration with real dependencies in `*.integration.test.ts`.
- Do not test what the compiler rejects (no casts to build invalid values).
- Vitest `test`/`describe`; test names are sentences describing behaviour.

## Docs

- Markdown: one sentence per line, simplified technical English.
- Ask the user before creating new `*.md` files.
