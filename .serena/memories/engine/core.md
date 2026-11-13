# Engine

Three layers; they separate responsibility, not imports.

1. Requests (`requests/`): untrusted client asks; change nothing. Each holds `lastVersionSeen`.
2. Request handling (`requestHandling/`): `handleRequest` switches on phase, one `handle<Phase>Phase` each. Switch has no default on purpose: new phase must break the build. Rejection = returned `{ error }`, never a throw. Accepted = `{ actions }` of plain actions and/or thunks (`PhaseHandlingResult`).
3. Store (`reducers/gameSlice.ts`, `store.ts`): reducers alone progress the game. They do not check phase (layer 2 did). They throw (`requireFound`) when a selector from `dataTypes/selectors.ts` finds no data: that is a layer-2 bug.

`advanceGame.ts` connects layers: handle request, dispatch actions, then deal the next round when the phase is `EndOfRound`.

## Invariants

- Reducers pure. Anything random (shuffle, `requestHandling/shuffledRound.ts`) runs in a thunk only. Reducers cannot dispatch: a reducer marks a phase, `advanceGame` reacts.
- `GameState`: `PreStart` member holds no round; all other phases share ONE union member (`RoundPhase`) so a reducer can assign `state.phase` on the immer draft. Do not split it per phase.
- Immer: mutate draft OR return new value, never both.
- Version: every game action bumps `version.sequence` by 1; reducer decides major vs minor (`majorVersionBump`/`minorVersionBump`). Major = invalidates in-flight requests. Actions carry no version.
- History (`reducers/history.ts`): each applied game action paired with the version it acted on. `store.ts` uses a hand-written `rootReducer`, not `combineReducers`, for that reason. History goes to clients: never put hidden information (e.g. a future deck) in an action payload.
- Card IDs assigned after shuffle so an ID does not reveal the face value.
- `RoundState.penaltyPiles` outlive a round; `startRound` keeps them.
- `revealPickedCards` resolves a whole turn; `placePickedCards` is the re-entry point for the (unwritten) row pick reducer. Game over mid-placement leaves remaining picked cards unplaced, intentionally.

## Not implemented

Row pick and game over handling are stubs that throw. Request-vs-version resolution not coded.
