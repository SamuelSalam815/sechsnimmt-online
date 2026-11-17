# Conventions

## Code

- Biome style: single quotes, semicolons, trailing commas, 2 spaces, width 80.
- Simple explicit code over abstractions; smallest change.
- String enums, not unions of string literals, for tags, statuses and error codes (`GamePhase`, `RequestType`, `ErrorCode`, `StreamStatus`); see docs/data-type-design.md. `import type` for types.
- An operation that can fail returns `Result<T>` (`src/engine/result.ts`); a search that misses passes through `lookup`. Chain with `andThen`/`use`; `force()` only where the value must exist (a miss is a bug and throws). See `docs/data-type-design.md`.
- Branded data types: only the owning module builds a value, with one `as` behind an inline `biome-ignore`.
- Comments state what code cannot: reasons, rejected designs, workarounds, external constants. Short declarative sentences (STE style), often "X. Y therefore Z."

## Tests

- A unit test examines one module, pure or impure. An integration test runs several modules through one entry point, in `*.integration.test.ts`. No mocks of external dependencies; impure code runs with its real dependencies.
- Do not test what the compiler rejects (no casts to build invalid values).
- Vitest `test`/`describe`; test names are sentences describing behaviour.

## Docs

- Markdown: one sentence per line, simplified technical English.
- Ask the user before creating new `*.md` files.
