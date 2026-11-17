# Engine

Three layers; they separate responsibility, not imports.

1. Requests (`requests/`): untrusted client asks; change nothing. Each holds `lastVersionSeen`.
2. Request handling (`requestHandling/`): `handleRequest` switches on phase, one `handle<Phase>Phase` each. Switch has no default on purpose: new phase must break the build. Rejection = returned `{ error }`, never a throw. Accepted = `{ actions }` of plain actions (`PhaseHandlingResult`).
3. Store (`reducers/gameSlice.ts`, `store.ts`): reducers alone progress the game. They do not check phase (layer 2 did). They throw (`requireFound`) when a selector from `dataTypes/selectors.ts` finds no data: that is a layer-2 bug.

`advanceGame(rootState, request)` is the one entry point: pure, returns the next `RootState` or an `ErrorMessage`.

## Invariants

- Engine pure. The shuffle (`shuffledDeck.ts`) is the one impure function; its deck enters as data in the start game / start round request. A round that ends rests in `EndOfRound` until a start round request arrives.
- Actions carry no object that a reducer must find by identity (immer drafts, JSON replay on the client). `removeCardFromHand` compares by reference.
- `GameState`: `PreStart` member holds no round; all other phases share ONE union member (`RoundPhase`) so a reducer can assign `state.phase` on the immer draft. Do not split it per phase.
- Immer: mutate draft OR return new value, never both.
- Version: every game action bumps `version.sequence` by 1; reducer decides major vs minor (`majorVersionBump`/`minorVersionBump`). Major = invalidates in-flight requests. Actions carry no version.
- History (`reducers/history.ts`): each applied game action paired with the version it acted on. `store.ts` uses a hand-written `rootReducer`, not `combineReducers`, for that reason. History goes to clients: never put hidden information (e.g. a future deck) in an action payload.
- Card IDs assigned after shuffle so an ID does not reveal the face value.
- `RoundState.penaltyPiles` outlive a round; `startRound` keeps them.
- `revealPickedCards` resolves a whole turn; `pickRow` (`resolveRowPick`) places the row picker's card and resumes the reveal. Game over mid-placement leaves remaining picked cards unplaced, intentionally.
- `abandonGame` removes the player; fewer than `MIN_PLAYER_COUNT` players → GameOver.

## Not implemented

Hidden information is not yet hidden from clients (see `TODO.md`).
