# Engine

Three layers; they separate responsibility, not imports.

1. Requests (`requests/`): untrusted client asks; change nothing. Each holds `lastVersionSeen`.
2. Request handling (`requestHandling/`): `handleRequest` checks staleness first (`ErrorCode.StaleRequest`), then switches on phase, one `handle<Phase>Phase` each. Switch has no default on purpose: new phase must break the build. Rejection = returned `ErrorMessage { errorCode, message }` (`src/engine/result.ts`), never a throw. Game rules (`penaltyLimit`, `handSize`) come with the start game request and live in the game state; `STANDARD_GAME_RULES` is 66 / 10. Accepted = `{ actions }` of plain actions (`PhaseHandlingResult`).
3. Store (`reducers/gameSlice.ts`, `store.ts`): reducers alone progress the game. They do not check phase (layer 2 did). They throw (`force()` on the `Result` of a search, e.g. `findSeat` in `dataTypes/table/roundLifecycle.ts`) when the search finds no data: that is a bug in the engine, not a rejected request.

`advanceGame(rootState, request)` is the one entry point: pure, returns the next `RootState` or an `ErrorMessage`.

## Invariants

- Engine pure. The shuffle (`shuffledDeck.ts`) is the one impure function; its deck enters as data in the start game / start round request. A round that ends rests in `EndOfRound` until a start round request arrives.
- Actions carry no object that a reducer must find by identity (immer drafts, JSON replay on the client). `playPickedCard` removes a card by ID.
- `GameState`: `PreStart` member holds no round; all other phases share ONE union member (`RoundPhase`). Do not split it per phase. `assertRoundInProgress` (`dataTypes/game/gameState.ts`) narrows to `RoundGameState`.
- Reducers write into the immer draft; rules such as `resolveReveal` take the draft and return only the next phase. `startGame` returns a new state, because it leaves the `PreStart` member. Request handling foresees an outcome by running `gameSlice.reducer` (`docs/data-type-design.md`).
- Version: every game action bumps `version.sequence` by 1; reducer decides major vs minor (`majorVersionBump`/`minorVersionBump`). Major = invalidates in-flight requests. Actions carry no version.
- History (`reducers/history.ts`): each applied game action paired with the version it acted on. `store.ts` uses a hand-written `rootReducer`, not `combineReducers`, for that reason. History goes to clients: never put hidden information (e.g. a future deck) in an action payload.
- Card IDs assigned after shuffle so an ID does not reveal the face value.
- Per round (`Round` in `dataTypes/table/roundLifecycle.ts`): `rows` and `seats`, an entity collection of `RoundSeat` (hand, `pickedCardId`, `penaltyPile`) by player ID; `dealRound` makes fresh seats. Across rounds (`GameState.players`, an entity collection): each `Player.penaltyScore`; a taken row adds its penalty at once (`addPenaltyToPlayer`).
- `revealResolution.ts` holds the reveal and row-pick rules; they mutate the draft of the round and the players.
- `revealPickedCards` resolves a whole turn; `pickRow` (`resolveRowPick`) places the row picker's card and resumes the reveal. Game over mid-placement leaves remaining picked cards unplaced, intentionally.
- `abandonGame` removes the player and the seat; fewer than `MIN_PLAYER_COUNT` players → GameOver.

## Not implemented

Hidden information is not yet hidden from clients (see `TODO.md`).
