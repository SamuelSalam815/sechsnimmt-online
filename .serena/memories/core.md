# Core

Online card game. Engine (Redux Toolkit) runs on server and in client; client only replays actions.

## Source map

- `src/engine` — all game logic, no React. Details: `mem:engine/core` (layers, phases, reducer invariants).
- `src/server` — one Redux store per room (`roomStore/`: slices room / engine / eventStream, thunks for routes, listeners for I/O). Details: `docs/server-architecture.md`.
- `src/client` — React shell only (`main.tsx`, `App.tsx`, typed hooks). No game logic.
- `docs/` — authoritative design: `game-flow-architecture.md` (layers, versions), `game-rules.md`, `rule-clarifications.md` (decisions where rules are vague; code follows these), `testing-strategy.md`.
- `TODO.md` — open work.

## Pointers

- Stack and pins: `mem:tech_stack`.
- npm scripts and the test-kind split: `mem:suggested_commands`.
- Comment, test and doc writing rules: `mem:conventions`.
- Checks and git rules before a task is done: `mem:task_completion`.
