# Engine

Three layers; they separate responsibility, not imports.

1. Requests (`requests/`): untrusted client asks; change nothing. Each holds `lastVersionSeen`.
2. Request handling (`requestHandling/`): `handleRequest` checks staleness first (`ErrorCode.StaleRequest`), then switches on phase, one `handle<Phase>Phase` each. Switch has no default on purpose: new phase must break the build. Rejection = returned `ErrorMessage { errorCode, message }` (`src/engine/result.ts`), never a throw. Game rules (`penaltyLimit`, `handSize`) come with the start game request and live in the game state; `STANDARD_GAME_RULES` is 66 / 10. Accepted = `{ actions }` of plain actions (`PhaseHandlingResult`). Layer 2 holds every rule ("decide"): reads plain state, never mutates, no RTK/immer import (Biome `noRestrictedImports`; RTK/immer allowed only in `reducers/`, `store.ts`, `src/server/roomStore/`, `src/server/infrastructure/logger.ts`, tests; data types may import `createEntityAdapter`/`EntityState`). Looks ahead with `applyActions` (`requestHandling/applyActions.ts`: fold through `gameSlice.reducer`).
3. Store (`reducers/gameSlice.ts`, `store.ts`): reducers apply what an action says; no rule, no decision, no phase check (layer 2 decided). They throw (`force()` on the `Result` of a search, e.g. `findSeat` in `dataTypes/table/roundLifecycle.ts`) when the search finds no data: that is a bug in the engine, not a rejected request.

`advanceGame(rootState, request)` is the one entry point: pure, returns the next `RootState` or an `ErrorMessage`.

## Invariants

- Engine pure. The shuffle (`shuffledDeck.ts`) is the one impure function; its deck enters as data in the start game / start round request. A round that ends rests in `EndOfRound` until a start round request arrives.
- Actions carry no object that a reducer must find by identity (immer drafts, JSON replay on the client). `playPickedCard` removes a card by ID.
- `GameState`: `PreStart` member holds no round; all other phases share ONE union member (`RoundPhase`). Do not split it per phase. `assertRoundInProgress` (`dataTypes/game/gameState.ts`) narrows to `RoundGameState`.
- Reducers write into the immer draft. `startGame` returns a new state, because it leaves the `PreStart` member.
- Version: every game action bumps `version.sequence` by 1; reducer bumps major vs minor mechanically (`majorVersionBump`/`minorVersionBump`). Only `pickCard`/`unpickCard` are minor. Major = invalidates in-flight requests. Actions carry no version. The actions of one request reach the store together (server: one `engine/actionsApplied`).
- History (`reducers/history.ts`): each applied game action paired with the version it acted on. `store.ts` uses a hand-written `rootReducer`, not `combineReducers`, for that reason. History goes to clients: never put hidden information (e.g. a future deck) in an action payload.
- Card IDs assigned after shuffle so an ID does not reveal the face value.
- Per round (`Round` in `dataTypes/table/roundLifecycle.ts`): `rows` and `seats`, an entity collection of `RoundSeat` (hand, `pickedCardId`, `penaltyPile`) by player ID; `dealRound` makes fresh seats. Across rounds (`GameState.players`, an entity collection): each `Player.penaltyScore`; a taken row adds its penalty at once (`addPenaltyToPlayer`).
- Decide/apply, one action per event (`docs/game-flow-architecture.md` "Decide and apply"). Rules: `requestHandling/resolveReveal.ts` (`resolveReveal`, `resolveRowPick`), `requestHandling/resolveAbandon.ts`; pure readers in `dataTypes/table/revealResolution.ts` (`findRowIndexForCard`, `findCardForRowPick`, `listRevealedCardsLowestFirst`, `findRowIndexOfLargestPenalty`), `row.ts` `isRowFull`, `player.ts` `hasReachedPenaltyLimit`/`hasEnoughPlayers`.
- Actions: `startGame`, `startRound`, `pickCard`, `unpickCard`, `revealPickedCards({ revealedCards: {playerId, card}[] })`, `placeCard`/`takeRow({ playerId, card, rowIndex })` (`CardPlacementPayload`; takeRow reads taken cards from the row), phase actions `awaitCardPick()`, `awaitRowPick()`, `endRound()`, `endGame()`, `abandonGame({ playerId })` (only removes player + seat; layer 2 adds `endGame` if too few remain).
- `selectLastRevealEvents(history)` (`reducers/history.ts`): last reveal + following placeCard/takeRow (incl. row pick); takeRow events carry `takenCards` computed by replay.
- Game over mid-placement leaves remaining picked cards unplaced, intentionally.
- Test-only invariant check `testSupport/gameStateInvariants.ts` (card in one place, pick in hand; no rule restated). Integration test writes a text trace to `__snapshots__/advanceGame.integration.txt`.

## Not implemented

Hidden information is not yet hidden from clients (see `TODO.md`).
