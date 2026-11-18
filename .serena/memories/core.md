# Core

Online card game. Engine (Redux Toolkit) runs on server and in client; client only replays actions.

## Source map

- `src/engine` — all game logic, no React. Details: `mem:engine/core` (layers, phases, reducer invariants).
- `src/server` — one Redux store per room. Details: `docs/server-architecture.md`. In `roomStore/`:
  - `roomStore.ts`: `RoomEffects` (all I/O), reducer composition, store types, `createRoomStore`.
  - `roomSlice.ts`, `eventStreamSlice.ts`: the room and stream slices.
  - `engineBridge.ts`: `engineActionsApplied` (one request's actions as one action), `applyEngineRequest`.
  - `roomThunks.ts`: one thunk per route, plus `deal`.
  - `roomListeners.ts`: the four listeners (grace timers, history and room view broadcasts, deal). Deal registers last.
  - `roomRouter.ts`: the imperative shell (express routes, SSE responses, timers).
  - Action logging with token redaction: `infrastructure/logger.ts`.
- `src/client` — React shell only (`main.tsx`, `App.tsx`, typed hooks). No game logic.
- `docs/` — authoritative design: `game-flow-architecture.md` (layers, versions), `game-rules.md`, `rule-clarifications.md` (decisions where rules are vague; code follows these), `testing-strategy.md`.
- `TODO.md` — open work.

## Pointers

- Stack and pins: `mem:tech_stack`.
- npm scripts and the test-kind split: `mem:suggested_commands`.
- Comment, test and doc writing rules: `mem:conventions`.
- Checks and git rules before a task is done: `mem:task_completion`.
