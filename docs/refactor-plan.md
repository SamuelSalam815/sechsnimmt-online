# Refactor plan

This plan comes from a code review of the `game-room-api` branch, done on 2026-11-17.
It also holds three entries of `TODO.md`.
The work is in three sessions.
The decisions are made; the user made each one.

## How to work through this plan

- Do the sessions in order. Session 3 can come before session 2, because the engine and the server are separate.
- Before session 1, commit the uncommitted changes on `game-room-api`. The user approved this.
- Commit as you go. After each item, run `npm run format` and the tests, then commit that item before the next one starts. Formatter changes to unrelated files go in a separate commit.
- Tick an item in this file in the commit that closes it.
- Remove a `TODO.md` entry in the commit that closes it.
- When all items are ticked, ask the user if this file goes.

## Session 1: Engine structure

The moves come first, so later edits land in the final paths.

### Data types

- [x] Move `getDeckFaceValues` out of `src/engine/dataTypes/card.ts`. Its one caller is `src/engine/shuffledDeck.ts`. Put it into that module or into `deck.ts`.
- [x] Rename `PenaltyAccrual` to `PenaltyTotal`, and `penaltyAccrual.ts` to `penaltyTotal.ts`. Update `docs/data-type-design.md`, which names `penaltyAccrual.ts`.
- [x] Move `src/engine/dataTypes/result.ts` to `src/engine/result.ts`. Make an `infrastructure` folder only when a second type of its kind comes.
- [x] Put the data types into folders under `src/engine/dataTypes`:

| Folder        | Modules                                         |
| ------------- | ----------------------------------------------- |
| `playerState` | `hand`, `penaltyTotal`, `penaltyPile`, `player` |
| `cards`       | `card`, `deck`                                  |
| `table`       | `row`, the modules from the round split         |
| `game`        | `gameState`, `gameStateVersion`, `gameRules`    |

### Round split

- [x] Split `round.ts` into three modules in the `table` folder.
      The third module is an experiment: keep it if it reads well, else fold it back into the others.

| Draft module       | Concern                       | Functions and types now in `round.ts`                                                                                                                                                                           |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `revealResolution` | Place the revealed cards      | `resolveReveal`, `revealedCardsLowestFirst`, `placeRevealedCard`, `placeCardInRows`, `findRowForCard`, `takeCardsIntoPenaltyPile`, `reachesPenaltyLimit`, `RevealOutcome`, `RevealedCard`, `CardPlacement`      |
| `playerChoices`    | Card pick, row pick, abandon  | `pickCardInRound`, `unpickCardInRound`, `findPick`, `findPickedCardId`, `picksWithout`, `CardPicks`, `RowPick`, `resolveRowPick`, `findCardForRowPick`, `findRowIndexOfLargestPenalty`, `removePlayerFromRound` |
| `roundLifecycle`   | Deal, cleanup, shared lookups | `Round`, `brandAsRound`, `createRound`, `dealRound`, `everyHandIsEmpty`, `ROW_COUNT`, `findHand`, `findRow`, `findPileOfPlayer`, `handsWith`, `pilesWith`                                                       |

The module names and the place of each function are a draft.

- [x] Decide how the other two modules build a `Round`. `docs/data-type-design.md` says that only the owning module builds a value, and `brandAsRound` is private now. Ask the user if the choice is unclear.
- [x] Split `round.test.ts` the same way.
- [x] Update `docs/data-type-design.md`, which names `round.ts` as the model for the naming rule.

### Comments

The comments below name "Layer 2" without context, or explain code that their module does not own.

| Location                | Now                                               | Change                                                                                                                                    |
| ----------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `gameSlice.ts:41`       | Layer 2 found the card in the hand of the player. | Remove the comment.                                                                                                                       |
| `gameSlice.ts:48`       | which layer 2 confirmed is                        | Say why the pick is found by player ID alone: a player has at most one card picked at a time.                                             |
| `gameSlice.test.ts:260` | Layer 2 rejects such a request                    | Say that an action that does not fit the state means a bug in the request handling, which only makes actions valid for the current state. |
| `result.ts:0`           | Layer 2 checks the staleness of a request         | Remove the comment.                                                                                                                       |
| `result.ts:12`          | Layer 2 returns it as the rejection               | Say only that expected cases, such as bad requests, use structured errors, whose kinds the error codes list.                              |

The line numbers are from before the moves.

- [x] Change the comments as the table says.
- [x] For each comment dropped because it explains code that its module does not own: if the reason is not documented, document it. If the reason is local to the other module, move it into that module.
- [x] Remove the shuffle comments in `startGameRequest.ts:11` and `startRoundRequest.ts:7`. `docs/game-flow-architecture.md` (Layer 2: Request handling) states the decision. It gets no heading of its own.

## Session 2: Engine readability and tests

### Reducers and request handling

- [x] In `src/engine/reducers/gameSlice.ts`, move the body of each of the 7 reducers into a local function, so the `reducers` object reads as a list. Export nothing new.
- [x] Keep the name `doesGameHaveEnoughPlayers` (`player.ts`). Rename its test block in `player.test.ts`, which is still named `hasEnoughPlayers`, to match.
- [x] In `src/engine/requestHandling/handleRequest.ts`, replace `staleMaker` and the comment over `checkRequestStillGood`. Query the last major change in the history. Then set `isRequestStale` to whether its version is greater than `request.lastVersionSeen`. `isRequestStale` in `gameStateVersion.ts` may then be unused.

Immer: no change. Every reducer returns a new `GameState`, so immer does no work, as `docs/data-type-design.md` (Immutable collections) requires.
Keep Redux Toolkit. Revisit only in a later performance evaluation.

### Tests

The rule: assert that an error occurs and, at most, its error code. Test each rule once, in the lowest module that owns it.

- [x] Remove the `message` assertions. There are about 21 in these test files: `hand`, `player`, `round`, `handleCardPickPhase`, `handleRowPickPhase`, `handleRequest`, `handlePreStartPhase`, `handleEndOfRoundPhase`, `handleGameOverPhase`, `advanceGame`. Keep the messages in `result.test.ts`, because there the message is the subject of the test.
- [x] Move the immutability assertion in the `removeCardFromHand` test of `hand.test.ts` into its own test. Look for the same pattern in the other data type tests.
- [ ] Remove tests that repeat a lower module. Example: "uses all 104 cards for 10 players" in `round.test.ts` repeats the dealing test of the deck. Also check `gameRules.test.ts` and `shuffledDeck.test.ts`, which compare against `getDeckFaceValues`.
- [ ] Write the rule in `docs/testing-strategy.md`.
- [ ] From `TODO.md`: add a fairness test for the shuffle. See `docs/testing-strategy.md`.

## Session 3: Server

### Folders

- [ ] Put the files of `src/server` into folders. Tests move with their modules. Update `docs/server-architecture.md` if it names paths.

| Folder               | Files                                                       |
| -------------------- | ----------------------------------------------------------- |
| `infrastructure`     | `actor`, `logger`, `message`, `requestBody`, `requireValue` |
| `eventStream`        | `eventStream`, `eventStreamCore`                            |
| `gameRunner`         | `gameRunner`, `gameRunnerCore`                              |
| `room`               | `room`, `roomCore`                                          |
| `restHandler`        | `restHandler`, `restHandlerCore`                            |
| `src/server` (stays) | `main`, `clientServing`                                     |

### Request body parsing

- [ ] Add plain functions on top of `readString` and `readInteger` that parse a request body into a typed value, or a `Lookup` failure, per route. Add a class only if a need shows. The fields that the code reads now:
  - `gameRunnerCore.ts`: `clientToken`, `lastVersionSeen`, `cardId`, `rowIndex`
  - `roomCore.ts`: `name`, `clientToken`

### From TODO.md

- [ ] Keep the client tokens out of the logs. It touches `logger`, `message` and the actors. Do it after the move.
- [ ] Handle the rejection of a game start with too few seats in `gameRunnerCore.ts`. The game runner throws on `invalidGameRules` now.

## Out of this plan

These `TODO.md` entries stay there:

- Hide the hidden information from the clients. It is feature work.
- Write the client. It is feature work.
- Decide on a length limit for a mailbox. The user left it for later.
